extern crate clap;
extern crate colored;
extern crate diff;
extern crate itertools;
extern crate regex;
extern crate term_size;

mod diffs;
mod language;
mod lines;

use clap::{App, Arg};
use diffs::{added, difference_positions, highlight_differences, removed};
use itertools::EitherOrBoth::{Both, Left, Right};
use itertools::Itertools;
use language::{infer_language, Language};
use lines::{add_context, max_line, relevant_lines, LineNumber};
use std::cmp::max;
use std::collections::HashSet;
use std::fs;
use std::iter::FromIterator;

fn term_width() -> Option<usize> {
    if let Some((w, _)) = term_size::dimensions() {
        return Some(w);
    }
    None
}

fn max_line_length(s: &str) -> usize {
    let mut max_length = 0;
    for line in s.lines() {
        max_length = max(max_length, line.len());
    }

    max_length
}

// Ensure that every line in S in the same length, by appending spaces as necessary.
fn pad_string(s: &str, min_length: usize) -> String {
    let mut result = String::with_capacity(s.len());
    for line in s.lines() {
        result.push_str(&format!("{:width$}\n", line, width = min_length));
    }
    result.push_str("\n");

    result
}

/// Return a copy of string that only contains the lines specified.
fn filter_lines(s: &str, lines_wanted: &[LineNumber]) -> String {
    let lines_wanted: HashSet<usize> =
        HashSet::from_iter(lines_wanted.iter().map(|line| line.number));

    let mut result = String::new();
    let mut first = true;
    for (i, line) in s.lines().enumerate() {
        if lines_wanted.contains(&i) {
            if first {
                first = false;
            } else {
                result.push('\n');
            }
            result.push_str(line);
        }
    }
    result
}

#[test]
fn test_filter_lines() {
    let s = "foo\nbar\nbaz\nquux";
    let result = filter_lines(s, &[LineNumber::from(1), LineNumber::from(3)]);
    assert_eq!(result, "bar\nquux");
}

fn vertical_concat(left: &str, right: &str, max_left_length: usize) -> String {
    let mut result = String::with_capacity(left.len() + right.len());

    let spacer = "  ";
    for item in left.lines().zip_longest(right.lines()) {
        match item {
            Both(left_line, right_line) if left_line != "" => {
                result.push_str(left_line);
                result.push_str(spacer);
                result.push_str(right_line);
            }
            Both(_, right_line) | Right(right_line) => {
                result.push_str(&" ".repeat(max_left_length));
                result.push_str(spacer);
                result.push_str(right_line);
            }
            Left(left_line) => {
                result.push_str(left_line);
            }
        }
        result.push_str("\n");
    }

    result
}

fn main() {
    let matches = App::new("Difftastic")
        .version("0.1")
        .about("A word level diff tool that understands syntax!")
        .author("Wilfred Hughes")
        .arg(
            Arg::with_name("LANGUAGE")
                .long("lang")
                .takes_value(true)
                .help("Override the language parser"),
        )
        .arg(
            Arg::with_name("LINES")
                .long("context")
                .takes_value(true)
                .help("Number of lines of context (default 3)"),
        )
        .arg(Arg::with_name("first").index(1).required(true))
        .arg(Arg::with_name("second").index(2).required(true))
        .get_matches();

    let before_path = matches.value_of("first").unwrap();
    let mut before_src = fs::read_to_string(before_path).expect("Unable to read PATH 1");
    let after_path = matches.value_of("second").unwrap();
    let mut after_src = fs::read_to_string(after_path).expect("Unable to read PATH 2");

    let terminal_width = term_width().unwrap_or(80);
    let pad_to_length = std::cmp::max(max_line_length(&before_src), terminal_width / 2 - 1);
    // Pad the left column, so the right column aligns. Do this before
    // diffing, so we can calculate the visible length correctly.
    before_src = pad_string(&before_src, pad_to_length);
    // Pad after too, so unchanged comments don't have differing
    // whitespace.
    after_src = pad_string(&after_src, pad_to_length);

    let language = match matches.value_of("LANGUAGE") {
        Some(s) => Language::from(s).expect("No such language known."),
        _ => infer_language(before_path).expect("Could not infer language"),
    };

    let differences = difference_positions(&before_src, &after_src, language);

    let mut lines = vec![];
    lines.extend(relevant_lines(&removed(&differences), &before_src));
    lines.extend(relevant_lines(&added(&differences), &after_src));
    lines.sort();
    lines.dedup();

    let (mut before_colored, mut after_colored) =
        highlight_differences(&before_src, &after_src, &differences);

    let context = matches.value_of("LINES").unwrap_or("3");
    let context = usize::from_str_radix(context, 10).unwrap();
    let max_line_num = max_line(&before_src, &after_src);
    lines = add_context(&lines, context, max_line_num);

    // TODO: this is very dumb. We assume the left and right line
    // up (rather than showing gaps if we've just added a big
    // block of text).
    before_colored = filter_lines(&before_colored, &lines);
    after_colored = filter_lines(&after_colored, &lines);

    print!(
        "{}",
        vertical_concat(&before_colored, &after_colored, pad_to_length)
    );
}
