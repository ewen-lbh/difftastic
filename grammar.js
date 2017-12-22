const DIGITS = token(sep1(/[0-9]+/, /_+/))
const HEX_DIGITS = token(sep1(/[A-Fa-f0-9]+/, '_'))
const PREC = {
  COMMA: -1,
  DECLARATION: 1,
  COMMENT: 1,
  ASSIGN: 0,
  OBJECT: 1,
  TERNARY: 1,
  OR: 2,
  AND: 3,
  PLUS: 4,
  REL: 5,
  TIMES: 6,
  TYPEOF: 7,
  DELETE: 7,
  VOID: 7,
  NOT: 8,
  NEG: 9,
  INC: 10,
  NEW: 11,
  CALL: 12,
  MEMBER: 13
};

module.exports = grammar({
  name: 'java',

  extras: $ => [
    $.comment,
    /\s/
  ],

  conflicts: $ => [
    [$.class_modifier]
  ],

  rules: {
    program: $ => repeat($._statement),

    _statement: $ => choice(
      seq($._literal, $._semicolon),
      seq($._expression, $._semicolon),
      $._declaration
    ),

    _semicolon: $ => ';',

    _literal: $ => choice(
      $.integer_literal,
      $.floating_point_literal,
      $.boolean_literal,
      $.character_literal,
      $.string_literal,
      $.null_literal
    ),

    integer_literal: $ => choice(
      $.decimal_integer_literal,
      $.hex_integer_literal,
      $.octal_integer_literal,
      $.binary_integer_literal
    ),

    decimal_integer_literal: $ => DIGITS,

    hex_integer_literal: $ => token(seq(
        choice('0x', '0X'),
        HEX_DIGITS
    )),

    octal_integer_literal: $ => token(seq(
      choice('0o', '0O'),
      sep1(/[0-7]+/, '_')
      )),

    binary_integer_literal: $ => token(seq(
      choice('0b', '0B'),
      sep1(/[01]+/, '_')
    )),

    floating_point_literal: $ => choice(
      $.decimal_floating_point_literal,
      $.hex_floating_point_literal
    ),

    decimal_floating_point_literal: $ => token(
      choice(
        seq(DIGITS, '.', optional(DIGITS), optional(seq((/[eE]/), optional(choice('-', '+')), DIGITS)), optional(/[fFdD]/)),
        seq('.', DIGITS, optional(seq((/[eE]/), optional(choice('-','+')), DIGITS)), optional(/[fFdD]/)),
        seq(DIGITS, /[eE]/, optional(choice('-','+')), DIGITS, optional(/[fFdD]/)),
        seq(DIGITS, optional(seq((/[eE]/), optional(choice('-','+')), DIGITS)), (/[fFdD]/))
      )),

    hex_floating_point_literal: $ => token(seq(
      choice('0x', '0X'),
      choice(
        seq(HEX_DIGITS, optional('.')),
        seq(optional(HEX_DIGITS), '.', HEX_DIGITS)
      ),
        /[eE]/,
      optional(choice('-','+')),
      DIGITS,
      optional(/[fFdD]/)
    )),

    boolean_literal: $ => choice('true', 'false'),

    character_literal: $ => seq("'", repeat(choice(/[^\'\n]/, /\\./, /\\\n/)), "'"),

    string_literal: $ => token(choice(
      seq('"', repeat(choice(/[^\\"\n]/, /\\(.|\n)/)), '"'),
      // TODO: support multiline string literals by debugging the following:
      // seq('"', repeat(choice(/[^\\"\n]/, /\\(.|\n)/)), '"', '+', /\n/, '"', repeat(choice(/[^\\"\n]/, /\\(.|\n)/)))
    )),

    null_literal: $ => 'null',

    ascii: $ => choice(
      'NUL', // (null)
      'SOH', // (start of heading)
      'STX', // (start of text)
      'ETX', // (end of text)
      'EOT', // (end of transmission)
      'ENQ', // (enquiry)
      'ACK', // (acknowledge)
      'BEL', // (bell)
      'BS', // (backspace)
      'TAB', // (horizontal tab)
      'LF', // (NL line feed, new line)
      'VT', // (vertical tab)
      'FF', // (NP form feed, new page)
      'CR', // (carriage return)
      'SO', // (shift out)
      'SI', // (shift in)
      'DLE', // (data link escape)
      'DC1', // (device control 1)
      'DC2', // (device control 2)
      'DC3', // (device control 3)
      'DC4', // (device control 4)
      'NAK', // (negative acknowledge)
      'SYN', // (synchronous idle)
      'ETB', // (end of trans. block)
      'CAN', // (cancel)
      'EM', // (end of medium)
      'SUB', // (substitute)
      'ESC', // (escape)
      'FS', // (file separator)
      'GS', // (group separator)
      'RS', // (record separator)
      'US' // (unit separator)
    ),

    white_space: $ => choice(
      $.space,
      $.horizontal_tab,
      $.form_feed,
      $.line_terminator
    ),

    space: $ => 'SP',
    horizontal_tab: $ => 'HT',
    form_feed: $ => 'FF',

    line_terminator: $ => choice(
      $.newline,
      $.return,
      seq($.return, $.newline)
    ),

    newline: $ => 'LF',
    return: $ => 'CR',

    unicode_escape: $ => seq(
      /\\/,
      'u',
      /[A-Fa-f0-9]+/,
      /[A-Fa-f0-9]+/,
      /[A-Fa-f0-9]+/,
      /[A-Fa-f0-9]+/
    ),

    escape_sequences: $ => choice(
      $.char_escapes,
      $.octal_escapes
    ),

    // currently, literals.java returns char not char_escapes in tree
    char_escapes: $ => choice(
      'b',
      't',
      'n',
      'f',
      'r',
      '"',
      "'",
      '\\'
    ),

    octal_escapes: $ => choice(
      seq(/\\/, /[0-7]+/),
      seq(/\\/, /[0-7]+/, /[0-7]+/),
      seq(/\\/, /[0-3]/, /[0-7]+/, /[0-7]+/)
    ),

    _expression: $ => choice(
      $.assignment_expression,
      $.binary_expression,
      // $.lambda_expression,
      $.ternary_expression,
      $.unary_expression,
      $.update_expression
    ),

    assignment_expression: $ => prec.right(PREC.ASSIGN, seq(
      // TODO: define lhs to replace expression
      $._expression,
      choice('=', '+=', '-=', '*=', '/=', '&=', '|=', '^=', '%=', '<<=', '>>=', '>>>='),
      $._expression)
    ),

    // TODO: define lhs to replace expression in assignment_expression
    // lhs: $ => choice(
    //   $.expression_name,
    //   $.field_access,
    //   $.array_access
    // ),
    //
    // field_access: $ => choice(
    //   seq($.primary, '.', $.identifier),
    //   seq('super', '.', $.identifier),
    //   seq($.type_name, '.', 'super', '.', $.identifier)
    // ),

    // primary: $ => choice(
    //   $._literal,
    //   // $.class_literal, - add
    //   'this',
    //   seq($.type_name, '.', 'this'),
    //   seq('(', $.argument_list, ')'),
    //   // $.class_instance_creation_expression, - add
    //   $.field_access,
    //   // $.array_access, - add
    //   $.method_invocation,
    //   // $.method_reference - add
    // ),

    // TODO: add variable
    binary_expression: $ => choice(
      prec.left(PREC.REL, seq($.unary_expression)),
      ...[
      ['>', PREC.REL],
      ['<', PREC.REL],
      ['==', PREC.REL],
      ['>=', PREC.REL],
      ['<=', PREC.REL],
      ['!=', PREC.REL],
      ['&&', PREC.AND],
      ['||', PREC.OR],
      ['+', PREC.PLUS],
      ['-', PREC.PLUS],
      ['*', PREC.TIMES],
      ['/', PREC.TIMES],
      ['&', PREC.AND],
      ['|', PREC.OR],
      ['^', PREC.OR],
      ['%', PREC.TIMES],
      ['<<', PREC.TIMES],
      ['>>', PREC.TIMES],
      ['>>>', PREC.TIMES],
    ].map(([operator, precedence]) =>
      prec.left(precedence, seq($._expression, operator, $._expression)))
    ),

    // TODO: fix lambda expression
    // lambda_expression: $ => seq($.lambda_parameters, '->', $.lambda_body),
    //
    // lambda_parameters: $ => choice(
    //   $.identifier,
    //   '(', $.formal_parameter_list, ')',
    //   '(', $.inferred_formal_parameter_list, ')'
    // ),
    //
    // inferred_formal_parameter_list: $ => seq(
    //
    // ),
    //
    // lambda_body: $ => seq(
    //   $._expression,
    //   $.block
    // ),

    // TODO: come back and fix: "Error: The rule `block` matches the empty string."
    // block: $ => repeat($.block_statements),
    //
    // block_statements: $ => seq(
    //   $.block_statement,
    //   repeat($.block_statement)
    // ),
    //
    // block_statement: $ => choice(
    //   $.local_variable_declaration_statement,
    //   $.class_declaration,
    //   $.statement
    // ),
    //
    // local_variable_declaration_statement: $ => seq(
    //   repeat($.variable_modifier),
    //   // $.unann_type,
    //   $.variable_declarator_list,
    //   $._semicolon
    // ),
    //
    // variable_modifier: $ => choice(
    //   $._annotation,
    //   'final'
    // ),
    //
    // variable_declarator_list: $ => seq(
    //   $.variable_declarator,
    //   repeat(',', $.variable_declarator)
    // ),
    //
    // variable_declarator: $ => seq(
    //   $.variable_declarator_id,
    //   optional('=', $.variable_initializer)
    // ),
    //
    // variable_declarator_id: $ => seq(
    //   $.identifier,
    //   optional($.dims)
    // ),
    //
    // variable_initializer: $ => choice(
    //   $._expression,
    //   $.array_initializer
    // ),
    //
    // array_initializer: $ => seq(
    //   repeat(seq(
    //     $.variable_initializer_list,
    //     ','
    //   ))
    // ),
    //
    // variable_initializer_list: $ => seq(
    //   $.variable_initializer,
    //   repeat(seq(',', $.variable_initializer))
    // ),

    // TODO: come back to this
    // annotation_type: $ => choice(
    //
    // ),

    // TODO: immutable variable assignment
    // final: $ => seq(),

    ternary_expression: $ => prec.right(PREC.TERNARY, seq(
      $._expression, '?', $._expression, ':', $._expression
    )),

    unary_expression: $ => choice(...[
      ['!', PREC.NOT],
      ['~', PREC.NOT],
    ].map(([operator, precedence]) =>
      prec.left(precedence, seq(operator, $._expression))
    )),

    update_expression: $ => prec.left(PREC.INC, choice(
      seq($._expression, '++'),
      seq($._expression, '--'),
      seq('++', $._expression),
      seq('--', $._expression)
    )),

    // TODO: verify: https://docs.oracle.com/javase/specs/jls/se9/html/jls-14.html#jls-Statement
    statement: $ => choice(
      // $.statement_without_trailing_substatement,
      // $.labeled_statement,
      $.if_then_statement,
      // $.while_statement,
      // $.for_statement
    ),

    // statement_no_short_if: $ => choice(
    //   // $.statement_without_trailing_substatement,
    //   // $.labeled_statement_no_short_if,
    //   // $.if_then_else_statement_no_short_if,
    //   // $.while_statement_no_short_if,
    //   // $.for_statement_no_short_if
    // ),

    // statement_without_trailing_substatement: $ => choice(
      // $.block,
      // $.empty_statement,
      // $.expression_statement,
      // $.assert_statement,
      // $.switch_statement,
      // $.do_statement,
      // $.break_statement,
      // $.continue_statement,
      // $.return_statement,
      // $.synchronized_statement,
      // $.throw_statement,
      // $.try_statement
    // ),

    // TODO: make if statement pass by defining variables
    if_then_statement: $ => prec.right(seq('if', '(', $._expression, ')',
      choice(
        optional('{'), $._statement, optional('}'),
        repeat($.else_if_clause),
        optional($.else_clause)
      )
    )),

    else_if_clause: $ => seq(
      'else if',
      '(', $._expression, ')',
      optional('{'),
      $._statement,
      optional('}')
    ),

    else_clause: $ => seq(
      'else',
      optional('{'),
      $._statement,
      optional('}')
    ),

    // TODO: handle while_statement_no_short_if version
    while_statement: $ => seq(
      '(', $._expression, ')',
      $._statement
    ),

    // // TODO:
    // for_statement: $ => seq(
    //
    // ),

    // expression_statement: $ => choice(
    //   $.assignment_expression,
    //   $.update_expression,
    //   $.method_invocation,
    //   $.class_instance_creation_expression
    // ),

    // method_invocation: $ => choice(
    //   seq($.method_name, '(', optional($.argument_list), ')'),
    //   seq($.type_name, '.', optional($.type_argument), $.identifier, '(', optional($.argument_list), ')'),
    //   seq($.expression_name, '.', optional($.type_argument), $.identifier, '(', optional($.argument_list), ')'),
    //   seq($.primary, '.', optional($.type_argument), $.identifier, '(', optional($.argument_list), ')'),
    //   seq('super', '.', optional($.type_argument), $.identifier, optional($.argument_list))
    // ),

    // argument_list: $ => seq(
    //   repeat1(choice($.lambda_expression, $.assignment_expression))
    // ),
    //

    type_arguments: $ => seq(
      '<', commaSep1($.type_argument), '>'
    ),

    type_argument: $ => choice(
      $.reference_type,
      // $.wildcard
    ),
    //
    // wildcard: $ => seq(
    //   repeat($._annotation),
    //   $.wildcard_bounds
    // ),
    //
    // wildcard_bounds: $ =>

    reference_type: $ => prec.left(choice(
      seq($.class_or_interface_type, optional($.dims)),
      seq($.primitive_type, $.dims)
    )),

    class_or_interface_type: $ => prec.left(sep1(
        seq(repeat($._annotation), $.identifier, optional($.type_arguments)), '.'
    )),

    type_variable: $ => seq(
      repeat($._annotation),
      $.identifier
    ),

    dims: $ => repeat1(
      seq(repeat($._annotation), '[', ']')
    ),

    primitive_type: $ => choice(
      seq(repeat($._annotation), choice($.integral_type, $.floating_point_type)),
      seq(repeat($._annotation), 'boolean')
    ),

    // TODO: test
    integral_type: $ => choice(
      'byte',
      'short',
      'int',
      'long',
      'char'
    ),

    // TODO: test
    floating_point_type: $ => choice(
      'float',
      'double'
    ),

    _annotation: $ => choice(
      $.normal_annotation,
      $.marker_annotation,
      $.single_element_annotation
    ),

    normal_annotation: $ => seq(
      '@', $.package_or_type_name, '(', optional($.element_value_pair_list), ')',
    ),

    marker_annotation: $ => seq('@', $.package_or_type_name),

    // TODO: Replace choice($.identifier, $._literal) with $._statement once it's
    // more fleshed out; The Java spec uses element_value which infinitely loops
    single_element_annotation: $ => seq(
      '@', $.package_or_type_name, '(', choice($.identifier, $._literal), ')'
    ),

    element_value_pair_list: $ => commaSep1($.element_value_pair),

    element_value_pair: $ => prec.right(10, seq(
      $.identifier,
      '=',
      $.element_value
    )),

    element_value: $ => prec.left(1, choice(
      $._literal, // TODO: remove this later, not accounted for in spec
      $.conditional_expression,
      $.element_value_array_initializer,
      $._annotation
    )),

    element_value_array_initializer: $ => prec.left(seq(
      $.element_value,
      optional(',')
    )),

    // TODO: add tests for conditional expressions
    conditional_expression: $ => choice(
      $.conditional_or_expression,
      seq($.conditional_or_expression, '?', $._expression, ':', $.conditional_expression),
      // seq($.conditional_or_expression, '?', $._expression, ':', $.lambda_expression), TODO: define lambda expression
    ),

    conditional_or_expression: $ => choice(
        $.conditional_and_expression,
        seq($.conditional_or_expression, '||', $.conditional_and_expression)
    ),

    conditional_and_expression: $ => choice(
      $.inclusive_or_expression,
      seq($.conditional_and_expression, '&&', $.inclusive_or_expression)
    ),

    inclusive_or_expression: $ => choice(
      $.exclusive_or_expression,
      seq($.inclusive_or_expression, '|', $.exclusive_or_expression)
    ),

    exclusive_or_expression: $ => choice(
      $.and_expression,
      seq($.exclusive_or_expression, '^', $.and_expression)
    ),

    and_expression: $ => choice(
      $.relational_expression,
      seq($.equality_expression, '==', $.relational_expression),
      seq($.equality_expression, '!=', $.relational_expression)
    ),

    relational_expression: $ => choice(
      $.shift_expression,
      seq($.relational_expression, '<', $.shift_expression),
      seq($.relational_expression, '<', $.shift_expression),
    ),

    equality_expression: $ => choice(
      $.relational_expression,
      seq($.equality_expression, '==', $.relational_expression),
      seq($.equality_expression, '!=', $.relational_expression)
    ),

    shift_expression: $ => choice(
      $.additive_expression,
      seq($.shift_expression, '<<', $.additive_expression),
      seq($.shift_expression, '>>', $.additive_expression),
      seq($.shift_expression, '>>>', $.additive_expression)
    ),

    additive_expression: $ => choice(
      $.multiplicative_expression,
      seq($.additive_expression, '+', $.multiplicative_expression),
      seq($.additive_expression, '-', $.multiplicative_expression)
    ),

    multiplicative_expression: $ => choice(
      $.unary_expression,
      seq($.multiplicative_expression, '*', $.unary_expression),
      seq($.multiplicative_expression, '/', $.unary_expression),
      seq($.multiplicative_expression, '%', $.unary_expression)
    ),

    _declaration: $ => choice(
      $.module_declaration,
      $.package_declaration,
      $.import_statement,
      $.class_declaration
    ),

    module_declaration: $ => seq(
      repeat($._annotation),
      optional('open'),
      'module',
      $.module_identifier,
      '{',
      repeat($.module_directive),
      '}'
    ),

    // TODO: revisit and change to 'name'
    // Unsure if this is the same as name, since it repeats
    module_identifier: $ => seq(
      $.identifier,
      repeat(seq('.', $.identifier))
    ),

    module_directive: $ => seq(choice(
      seq('requires', repeat($.requires_modifier), $.module_name),
      seq('exports', $.package_or_type_name, optional('to'), optional($.module_name), repeat(seq(',', $.module_name))),
      seq('opens', $.package_or_type_name, optional('to'), optional($.module_name), repeat(seq(',', $.module_name))),
      seq('uses', $.package_or_type_name),
      seq('provides', $.package_or_type_name, 'with', $.package_or_type_name, repeat(seq(',', $.package_or_type_name)))
    ), $._semicolon),

    requires_modifier: $ => choice(
      'transitive',
      'static'
    ),

    module_name: $ => choice(
      $.identifier,
      seq($.module_name, '.', $.identifier)
    ),

    package_declaration: $ => seq(
      repeat($._annotation),
      'package',
      $.identifier,
      repeat(seq('.', $.identifier)),
      $._semicolon
    ),

    package_or_type_name: $ => choice(
      $.identifier,
      seq($.package_or_type_name, '.', $.identifier)
    ),

    import_statement: $ => choice(
      $.single_type_import_declaration,
      $.type_import_on_declaraction,
      $.single_static_import_declaration,
      $.static_import_on_demand_declaration
    ),

    single_type_import_declaration: $ => seq(
      'import', $.package_or_type_name, $._semicolon
    ),

    type_import_on_declaraction: $ => seq(
      'import',
      $.package_or_type_name,
      '.',
      '*',
      $._semicolon
    ),

    single_static_import_declaration: $ => seq(
      'import',
      'static',
      $.package_or_type_name,
      '.',
      $.identifier,
      $._semicolon
    ),

    static_import_on_demand_declaration: $ => seq(
      'import',
      'static',
      $.package_or_type_name,
      '.',
      '*',
      $._semicolon
    ),

    class_declaration: $ => choice(
      $.normal_class_declaration
      // $.enum_declaration - thttps://docs.oracle.com/javase/specs/jls/se9/html/jls-8.html#jls-8.1ion
    ),

    normal_class_declaration: $ => seq(
      repeat($.class_modifier),
      'class',
      $.identifier,
      optional($.type_paramaters),
      optional($.superclass),
      optional($.super_interfaces),
      $.class_body
    ),

    class_modifier: $ => choice(
      $._annotation,
      'public',
      'protected',
      'private',
      'static',
      'final',
      'strictfp'
    ),

    type_paramaters: $ => seq(
      '<', $.type_parameter_list, '>'
    ),

    type_parameter_list: $ => commaSep1(
      $.type_parameter
    ),

    type_parameter: $ => seq(
      repeat($._annotation),
      $.identifier,
      optional($.type_bound)
    ),

    type_bound: $ =>
      seq('extends', $.class_or_interface_type, repeat(seq('&', $.class_or_interface_type))),

    superclass: $ => seq(
      'extends',
      $.class_or_interface_type
    ),

    super_interfaces: $ => seq(
      'implements',
      $.interface_type_list
    ),

    interface_type_list: $ => seq(
      $.class_or_interface_type,
      repeat(seq(',', $.class_or_interface_type))
    ),

    class_body: $ => seq(
      '{',
      repeat($.class_body_declaration),
      '}'
    ),

    class_body_declaration: $ => choice(
      $.class_member_declaration,
      // $.block,
      // $.static_initializer,
      // $.constructor_declaration
    ),

    class_member_declaration: $ => choice(
      // $.field_declaration,
      // $.method_declaration,
      $.class_declaration,
      // $.interface_declaration,
      $._semicolon
    ),

    // expression_name: $ => choice(
    //   $.identifier,
    //   seq($.identifier, '.', $.identifier)
    // ),

    // test
    method_name: $ => $.identifier,

    identifier: $ => /[a-zA-Z0-9]*/,

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: $ => token(prec(PREC.COMMENT, choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    ))),
  }
});

function sep1 (rule, separator) {
  return seq(rule, repeat(seq(separator, rule)));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}
