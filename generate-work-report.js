#!/usr/bin/env node

/**
 * Work Report Generator
 * Generates a report of all Git commits for a specified period
 * across all branches in the repository - grouped by branch with unique commits only.
 *
 * Usage: work-report [options]
 *
 * Options:
 *   --author="Your Name"     Filter commits by author
 *   --output=report.md       Specify custom output file path
 *   --period=week            Period type: week, month, quarter, year (default: week)
 *   --from=YYYY-MM-DD        Start date for custom range
 *   --to=YYYY-MM-DD          End date for custom range
 *   --help                   Show help message
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    acc[key] = value || true;
    return acc;
}, {});

/**
 * Show help message
 */
function showHelp() {
    console.log(`
Work Report Generator - Generate reports from Git commit history
Usage: work-report [options]
Options:
  --author="Name"      Filter commits by author
  --output=file.md     Specify custom output file path
  --period=<type>      Period type (default: week)
                       Types: week, month, quarter, year, thisweek, thismonth
  --from=YYYY-MM-DD    Start date for custom range
  --to=YYYY-MM-DD      End date for custom range
  --help               Show this help message
Period Types:
  week       Last week (Sunday to Saturday)
  thisweek   Current week so far
  month      Last month
  thismonth  Current month so far
  quarter    Last quarter
  year       Last year
  thisyear   Current year so far
Examples:
  work-report                              # Last week report
  work-report --period=month               # Last month report
  work-report --period=thisweek            # Current week so far
  work-report --from=2026-01-01 --to=2026-01-31  # Custom range
  work-report --author="John" --period=quarter   # Last quarter by author
`);
    process.exit(0);
}

/**
 * Get the date range for last week (Sunday to Saturday)
 */
function getLastWeekRange() {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToLastSaturday = currentDay === 6 ? 7 : currentDay + 1;
    const lastSaturday = new Date(today);
    lastSaturday.setDate(today.getDate() - daysToLastSaturday);
    lastSaturday.setHours(23, 59, 59, 999);
    const lastSunday = new Date(lastSaturday);
    lastSunday.setDate(lastSaturday.getDate() - 6);
    lastSunday.setHours(0, 0, 0, 0);
    return { start: lastSunday, end: lastSaturday };
}

/**
 * Get the date range for current week (Sunday to today)
 */
function getThisWeekRange() {
    const today = new Date();
    const currentDay = today.getDay();
    const thisSunday = new Date(today);
    thisSunday.setDate(today.getDate() - currentDay);
    thisSunday.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: thisSunday, end: end };
}

/**
 * Get the date range for last month
 */
function getLastMonthRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    lastDay.setHours(23, 59, 59, 999);
    return { start: firstDay, end: lastDay };
}

/**
 * Get the date range for current month (1st to today)
 */
function getThisMonthRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: firstDay, end: end };
}

/**
 * Get the date range for last quarter
 */
function getLastQuarterRange() {
    const today = new Date();
    const currentQuarter = Math.floor(today.getMonth() / 3);
    let lastQuarterStartMonth = (currentQuarter - 1) * 3;
    let year = today.getFullYear();
    if (currentQuarter === 0) {
        lastQuarterStartMonth = 9;
        year -= 1;
    }
    const firstDay = new Date(year, lastQuarterStartMonth, 1);
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(year, lastQuarterStartMonth + 3, 0);
    lastDay.setHours(23, 59, 59, 999);
    return { start: firstDay, end: lastDay };
}

/**
 * Get the date range for last year
 */
function getLastYearRange() {
    const today = new Date();
    const lastYear = today.getFullYear() - 1;
    const firstDay = new Date(lastYear, 0, 1);
    firstDay.setHours(0, 0, 0, 0);
    const lastDay = new Date(lastYear, 11, 31);
    lastDay.setHours(23, 59, 59, 999);
    return { start: firstDay, end: lastDay };
}

/**
 * Get the date range for current year (Jan 1 to today)
 */
function getThisYearRange() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), 0, 1);
    firstDay.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);
    return { start: firstDay, end: end };
}

/**
 * Get custom date range from arguments
 */
function getCustomRange(fromDate, toDate) {
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        console.error('Error: Invalid date format. Use YYYY-MM-DD format.');
        process.exit(1);
    }
    if (start > end) {
        console.error('Error: Start date must be before end date.');
        process.exit(1);
    }
    return { start, end };
}

/**
 * Get date range based on period type or custom range
 */
function getDateRange(period, fromDate, toDate) {
    if (fromDate && toDate) {
        return getCustomRange(fromDate, toDate);
    }
    switch (period?.toLowerCase()) {
        case 'thisweek':
            return getThisWeekRange();
        case 'month':
            return getLastMonthRange();
        case 'thismonth':
            return getThisMonthRange();
        case 'quarter':
            return getLastQuarterRange();
        case 'year':
            return getLastYearRange();
        case 'thisyear':
            return getThisYearRange();
        case 'week':
        default:
            return getLastWeekRange();
    }
}

/**
 * Format date for Git command (YYYY-MM-DD)
 */
function formatDateForGit(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Format date for filename (e.g., Feb-08-2026)
 */
function formatDateForFilename(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
}

/**
 * Format date for display
 */
function formatDateForDisplay(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Get all real branches (excluding tags and stash)
 */
function getAllBranches() {
    try {
        const output = execSync('git branch -a --format="%(refname:short)"', {
            encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
        });
        return output
            .split('\n')
            .filter((branch) => branch.trim())
            .filter((branch) => !branch.includes('stash') && !branch.startsWith('tag:'))
            .map((branch) => branch.trim().replace('origin/', ''));
    } catch (error) {
        console.error('Error fetching branches:', error.message);
        return [];
    }
}

/**
 * Get the root directory of the git repository
 */
function getGitRoot() {
    try {
        return execSync('git rev-parse --show-toplevel', {
            encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
        }).trim();
    } catch (error) {
        // Fallback to the current directory if not in a git repo
        return process.cwd();
    }
}

/**
 * Get commits for a specific branch within the date range
 */
function getCommitsForBranch(branch, startDate, endDate, author) {
    const authorFilter = author ? `--author="${author}"` : '';
    const dateFormat = '%Y-%m-%d %H:%M';
    const format = '%H|||%s|||%an|||%ad';
    try {
        const command = `git log ${branch} --since="${formatDateForGit(startDate)}" --until="${formatDateForGit(endDate)} 23:59:59" ${authorFilter} --format="${format}" --date=format:"${dateFormat}"`;
        const output = execSync(command, {
            encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024,
        });
        return output
            .split('\n')
            .filter((line) => line.trim())
            .map((line) => {
                const [hash, message, authorName, date] = line.split('|||');
                return {
                    hash: hash.substring(0, 7),
                    fullHash: hash,
                    message: message.trim(),
                    author: authorName.trim(),
                    date: date.trim(),
                };
            });
    } catch (error) {
        return [];
    }
}

/**
 * Get commits grouped by branch with unique commits only
 */
function getCommitsByBranch(startDate, endDate, author) {
    try {
        try {
            execSync('git fetch --all --quiet', { stdio: ['pipe', 'pipe', 'pipe'] });
        } catch (e) {
            // Ignore fetch errors
        }
        const branches = getAllBranches();
        const uniqueBranches = [...new Set(branches)];
        const commitsByBranch = {};
        const globalSeenHashes = new Set();
        for (const branch of uniqueBranches) {
            const commits = getCommitsForBranch(branch, startDate, endDate, author);
            const uniqueCommits = commits.filter((commit) => {
                if (globalSeenHashes.has(commit.fullHash)) {
                    return false;
                }
                globalSeenHashes.add(commit.fullHash);
                return true;
            });
            if (uniqueCommits.length > 0) {
                commitsByBranch[branch] = uniqueCommits;
            }
        }
        return commitsByBranch;
    } catch (error) {
        console.error('Error fetching commits:', error.message);
        return {};
    }
}

/**
 * Generate the report in Markdown format
 */
function generateMarkdownReport(commitsByBranch, dateRange, author) {
    const { start, end } = dateRange;
    let totalCommits = 0;
    for (const commits of Object.values(commitsByBranch)) {
        totalCommits += commits.length;
    }
    let report = `# Work Report\n\n`;
    report += `**Period:** ${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}\n\n`;
    report += `**Generated:** ${formatDateForDisplay(new Date())} at ${new Date().toLocaleTimeString()}\n\n`;
    if (author) {
        report += `**Author:** ${author}\n\n`;
    }
    report += `**Total Commits:** ${totalCommits}\n\n`;
    report += `---\n\n`;
    report += `## Summary by Branch\n\n`;
    report += `| Branch | Commits |\n`;
    report += `|--------|--------:|\n`;
    const branchNames = Object.keys(commitsByBranch).sort();
    for (const branch of branchNames) {
        report += `| ${branch} | ${commitsByBranch[branch].length} |\n`;
    }
    report += `\n`;
    report += `## Commits by Branch\n\n`;
    if (branchNames.length === 0) {
        report += `*No commits found for this period.*\n\n`;
    } else {
        for (const branch of branchNames) {
            let currentAuthor = '';
            report += `### ${branch}\n\n`;
            for (const commit of commitsByBranch[branch]) {
                if (!author && currentAuthor !== commit.author) {
                    currentAuthor = commit.author;
                    report += `\n**Author: ${commit.author}**\n\n`;
                }
                report += `- ${commit.message} \n`;
            }
            report += `\n`;
        }
    }
    return report;
}

/**
 * Generate a simple text report for console output
 */
function generateConsoleReport(commitsByBranch, dateRange, author) {
    const { start, end } = dateRange;
    let totalCommits = 0;
    for (const commits of Object.values(commitsByBranch)) {
        totalCommits += commits.length;
    }
    let report = `\n${'='.repeat(60)}\n`;
    report += `                    WORK REPORT\n`;
    report += `${'='.repeat(60)}\n\n`;
    report += `Period: ${formatDateForDisplay(start)}\n`;
    report += `     to ${formatDateForDisplay(end)}\n\n`;
    if (author) {
        report += `Author: ${author}\n`;
    }
    report += `Total Commits: ${totalCommits}\n`;
    report += `\n${'-'.repeat(60)}\n`;
    const branchNames = Object.keys(commitsByBranch).sort();
    if (branchNames.length === 0) {
        report += `\nNo commits found for this period.\n`;
    } else {
        for (const branch of branchNames) {
            const commits = commitsByBranch[branch];
            report += `\n[${branch}] (${commits.length} commits)\n`;
            report += `${'-'.repeat(40)}\n`;
            for (const commit of commits) {
                report += `  [${commit.hash}] ${commit.message}\n`;
                report += `           ${commit.date}`;
                if (!author) {
                    report += ` by ${commit.author}`;
                }
                report += `\n`;
            }
        }
    }
    report += `\n${'='.repeat(60)}\n`;
    return report;
}

/**
 * Main execution
 */
function main() {
    if (args.help || args.h) {
        showHelp();
    }
    console.log('Generating work report...\n');
    const period = args.period || 'week';
    const dateRange = getDateRange(period, args.from, args.to);
    const author = args.author || null;
    const outputFile = args.output || null;
    console.log(`Date range: ${formatDateForGit(dateRange.start)} to ${formatDateForGit(dateRange.end)}`,);
    if (args.from && args.to) {
        console.log('Using custom date range');
    } else {
        console.log(`Period: ${period}`);
    }
    if (author) {
        console.log(`Filtering by author: ${author}`);
    }
    const commitsByBranch = getCommitsByBranch(dateRange.start, dateRange.end, author);
    console.log(generateConsoleReport(commitsByBranch, dateRange, author));
    const reportDir = path.join(getGitRoot(), 'work-report');
    if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
    }
    const outputPath = outputFile ? path.resolve(outputFile) : path.join(reportDir, `work-report-${formatDateForFilename(dateRange.start)}-to-${formatDateForFilename(dateRange.end)}.md`,);
    const markdownReport = generateMarkdownReport(commitsByBranch, dateRange, author);
    fs.writeFileSync(outputPath, markdownReport, 'utf8');
    console.log(`\nMarkdown report saved to: ${outputPath}`);
}

main();
