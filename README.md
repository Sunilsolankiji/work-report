# work-report
[![npm version](https://img.shields.io/npm/v/work-report.svg)](https://www.npmjs.com/package/work-report)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Generate work reports from Git commit history across all branches.
## Installation
```bash
npm install -g work-report
```
Or run directly with npx:
```bash
npx work-report
```
## Usage
Run in any Git repository to generate a report:
```bash
work-report
```
### Options
| Option              | Description                              |
|---------------------|------------------------------------------|
| `--author="Name"`   | Filter commits by author                 |
| `--me`              | Use current git user as author           |
| `--output=file.md`  | Specify custom output file path          |
| `--period=<type>`   | Period type (default: week)              |
| `--from=YYYY-MM-DD` | Start date for custom range              |
| `--to=YYYY-MM-DD`   | End date for custom range                |
| `--help`            | Show help message                        |
### Period Types
| Period      | Description                              |
|-------------|------------------------------------------|
| `week`      | Last week (Sunday to Saturday) - default |
| `thisweek`  | Current week so far                      |
| `month`     | Last month                               |
| `thismonth` | Current month so far                     |
| `quarter`   | Last quarter                             |
| `year`      | Last year                                |
| `thisyear`  | Current year so far                      |
### Examples
```bash
# Generate report for last week (default)
work-report
# Generate report for current git user's commits
work-report --me
# Generate report for last month
work-report --period=month
# Generate report for current week so far
work-report --period=thisweek
# Generate report for last quarter
work-report --period=quarter
# Generate report for last year
work-report --period=year
# Custom date range
work-report --from=2026-01-01 --to=2026-01-31
# Filter by specific author
work-report --author="John Doe"
# Combine options
work-report --me --period=month --output=my-monthly-report.md
work-report --author="John Doe" --period=quarter --output=quarterly-report.md
```
## Output
The tool generates:
1. **Console output** - Summary displayed in the terminal
2. **Markdown file** - Detailed report saved to `work-report/` folder in your project root
The report includes:
- Date range for the selected period
- Total commit count
- Summary table by branch
- Detailed commits grouped by branch
### Output Location
By default, reports are saved to a `work-report/` folder in the root of your Git repository:
```
your-project/
+-- work-report/
�   +-- work-report-Feb-09-2026-to-Feb-15-2026.md
+-- src/
+-- ...
```
Use `--output` to specify a custom file path.
## Requirements
- Node.js >= 14.0.0
- Git installed and accessible from command line
- Must be run inside a Git repository
## License
MIT