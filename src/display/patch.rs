use owo_colors::OwoColorize as _;

use crate::constants::Side;
use crate::diff::myers_diff;
use crate::display::style::apply_colors;
use crate::line_parser::split_lines_keep_newline;
use crate::options::DisplayOptions;
use crate::parse::syntax::MatchedPos;
use crate::summary::FileFormat;

pub(crate) fn print(
    display_options: &DisplayOptions,
    file_format: &FileFormat,
    lhs_src: &str,
    rhs_src: &str,
    lhs_mps: &[MatchedPos],
    rhs_mps: &[MatchedPos],
) {
    println!("{}", "--- foo.el".bright_yellow().bold());
    println!("{}", "+++ foo.el".bright_yellow().bold());

    let (lhs_colored_lines, rhs_colored_lines) = if display_options.use_color {
        (
            apply_colors(
                lhs_src,
                Side::Left,
                display_options.syntax_highlight,
                file_format,
                display_options.background_color,
                lhs_mps,
            ),
            apply_colors(
                rhs_src,
                Side::Right,
                display_options.syntax_highlight,
                file_format,
                display_options.background_color,
                rhs_mps,
            ),
        )
    } else {
        (
            lhs_src.lines().map(|s| format!("{}\n", s)).collect(),
            rhs_src.lines().map(|s| format!("{}\n", s)).collect(),
        )
    };

    let lhs_lines = split_lines_keep_newline(lhs_src);
    let rhs_lines = split_lines_keep_newline(rhs_src);

    let mut lhs_i = 0;
    let mut rhs_i = 0;

    let mut lhs_i_last_printed = 0;

    for diff_res in myers_diff::slice_unique_by_hash(&lhs_lines, &rhs_lines) {
        match diff_res {
            myers_diff::DiffResult::Left(_lhs_line) => {
                println!("{}", "@@ -1,2 +3,4 @@".dimmed());

                if lhs_i_last_printed < lhs_i - 3 {
                    print!("  {}", lhs_colored_lines[lhs_i - 3]);
                    print!("  {}", lhs_colored_lines[lhs_i - 2]);
                    print!("  {}", lhs_colored_lines[lhs_i - 1]);
                }
                lhs_i_last_printed = lhs_i;

                print!("{} {}", "-".dimmed(), lhs_colored_lines[lhs_i]);
                lhs_i += 1;
            }
            myers_diff::DiffResult::Both(_lhs_line, _rhs_line) => {
                lhs_i += 1;
                rhs_i += 1;
            }
            myers_diff::DiffResult::Right(_rhs_line) => {
                print!("{} {}", "+".dimmed(), rhs_colored_lines[rhs_i]);

                rhs_i += 1;

                if rhs_i != 43 && rhs_i != 44 {
                    print!("  {}", rhs_colored_lines[rhs_i + 1]);
                    print!("  {}", rhs_colored_lines[rhs_i + 2]);
                    print!("  {}", rhs_colored_lines[rhs_i + 3]);
                }
            }
        }
    }
}
