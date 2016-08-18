const
  PREC = {
    unary: 6,
    multiplicative: 5,
    additive: 4,
    comparative: 3,
    and: 2,
    or: 1
  },

  multiplicative_operator = choice('*', '/', '%', '<<', '>>', '&', '&^'),
  additive_operator = choice('+', '-', '|', '^'),
  comparative_operator = choice('==', '!=', '<', '<=', '>', '>='),
  and_operator = '&&',
  or_operator = '||',

  unicodeLetter = /[a-zA-Z]/,
  unicodeDigit = /[0-9]/,
  unicodeChar = /./,
  unicodeValue = unicodeChar,

  hexDigit = /[0-9a-fA-F]/,
  octalDigit = /[0-7]/,
  decimalDigit = /[0-9]/,
  hexByteValue = seq('\\', 'x', hexDigit, hexDigit),
  octalByteValue = seq('\\', octalDigit, octalDigit, octalDigit)
  byteValue = choice(octalByteValue, hexByteValue),

  hexLiteral = token(seq('0', choice('x', 'X'), repeat1(hexDigit))),
  octalLiteral = token(seq('0', repeat(octalDigit))),
  decimalLiteral = token(seq(/[1-9]/, repeat(decimalDigit))),

  newline = '\n',
  letter = choice(unicodeLetter, '_'),

  exponent = seq(
    choice('e', 'E'),
    optional(choice('+', '-')),
    repeat1(decimalDigit)
  ),

  decimals = repeat1(decimalDigit),

  terminator = choice(newline, ';')

module.exports = grammar({
  name: 'go',

  extras: $ => [
    $.comment,
    /\s/
  ],

  conflicts: $ => [
    // A(b)
    //    ^-- type conversion or function call?
    [$._type, $._expression],
    [$.qualified_identifier, $._expression],
    [$.func_literal, $.function_type],
    [$.function_type],

    // func() (a)
    //          ^-- parameter list or type?
    [$._parameter_list, $._type],

    // if foo{}
    //     ^-- expression or type?
    [$.composite_literal, $._expression]
  ],

  rules: {
    source_file: $ => seq(
      $.package_clause,
      repeat($.import_declaration),
      repeat(seq($._top_level_declaration, terminator))
    ),

    package_clause: $ => seq(
      'package',
      $.identifier
    ),

    import_declaration: $ => seq(
      'import',
      choice(
        $.import_spec,
        seq(
          '(',
          repeat(seq(
            $.import_spec,
            terminator
          )),
          ')'
        )
      )
    ),

    import_spec: $ => seq(
      optional(choice($.identifier, '.')),
      $._string_literal
    ),

    _top_level_declaration: $ => choice(
      $._declaration,
      $.function_declaration,
      $.method_declaration
    ),

    _declaration: $ => choice(
      $.const_declaration,
      $.type_declaration,
      $.var_declaration
    ),

    const_declaration: $ => seq(
      'const',
      choice(
        $.const_spec,
        seq(
          '(',
          repeat(seq($.const_spec, terminator)),
          ')'
        )
      )
    ),

    const_spec: $ => seq(
      $.identifier_list,
      optional($._type),
      '=',
      $.expression_list
    ),

    var_declaration: $ => seq(
      'var',
      choice(
        $.var_spec,
        seq(
          '(',
          repeat(seq($.var_spec, terminator)),
          ')'
        )
      )
    ),

    var_spec: $ => seq(
      $.identifier_list,
      choice(
        seq(
          $._type,
          optional(seq('=', $.expression_list))
        ),
        seq('=', $.expression_list)
      )
    ),

    function_declaration: $ => seq(
      'func',
      $.identifier,
      $.parameters,
      optional(choice($.parameters, $._type)),
      optional($.block)
    ),

    method_declaration: $ => seq(
      'func',
      $.parameters,
      $.identifier,
      $.parameters,
      optional(choice($.parameters, $._type)),
      optional($.block)
    ),

    parameters: $ => seq(
      '(',
      optional($._parameter_list),
      ')'
    ),

    _parameter_list: $ => commaSepTrailing($._parameter_list, choice(
      $.identifier,
      $.parameter_declaration
    )),

    parameter_declaration: $ => seq(
      $.identifier,
      $._type
    ),

    type_declaration: $ => seq(
      'type',
      choice(
        $.type_spec,
        seq(
          '(',
          repeat(seq($.type_spec, terminator)),
          ')'
        )
      )
    ),

    type_spec: $ => seq($.identifier, $._type),

    identifier_list: $ => seq(
      $.identifier,
      repeat(seq(',', $.identifier))
    ),

    expression_list: $ => seq(
      $._expression,
      repeat(seq(',', $._expression))
    ),

    _type: $ => choice(
      $.identifier,
      $.qualified_identifier,
      $.pointer_type,
      $.struct_type,
      $.interface_type,
      $.array_type,
      $.slice_type,
      $.map_type,
      $.channel_type,
      $.function_type,
      seq('(', $._type, ')')
    ),

    pointer_type: $ => prec(PREC.unary, seq('*', $._type)),

    array_type: $ => seq(
      '[',
      $._expression,
      ']',
      $._type
    ),

    slice_type: $ => seq(
      '[',
      ']',
      $._type
    ),

    struct_type: $ => seq(
      'struct',
      '{',
      repeat(seq($.field_declaration, terminator)),
      '}'
    ),

    field_declaration: $ => seq(
      choice(
        seq($.identifier_list, $._type),
        seq(optional('*'), $.identifier)
      ),
      optional($._string_literal)
    ),

    interface_type: $ => seq(
      'interface',
      '{',
      repeat(seq(
        choice($.identifier, $.method_spec),
        terminator
      )),
      '}'
    ),

    method_spec: $ => seq(
      $.identifier,
      $.parameters,
      optional(choice($.parameters, $._type))
    ),

    map_type: $ => seq(
      'map',
      '[',
      $._type,
      ']',
      $._type
    ),

    channel_type: $ => choice(
      prec(5, seq('chan', $._type)),
      seq('chan', '<-', $._type),
      seq('<-', 'chan', $._type)
    ),

    function_type: $ => seq(
      'func',
      $.parameters,
      optional(choice($.parameters, $._type))
    ),

    block: $ => seq(
      '{',
      repeat(seq($._statement, terminator)),
      '}'
    ),

    _statement: $ => choice(
      $._declaration,
      $._simple_statement,
      $.return_statement,
      $.go_statement,
      $.defer_statement,
      $.if_statement,
      $.for_statement,
      $.expression_switch_statement,
      $.type_switch_statement,
      $.select_statement,
      $.fallthrough_statement,
      $.break_statement,
      $.continue_statement
    ),

    _simple_statement: $ => choice(
      $._expression,
      $.send_statement,
      $.inc_statement,
      $.dec_statement,
      $.assignment_statement,
      $.short_var_declaration
    ),

    send_statement: $ => seq(
      $._expression,
      '<-',
      $._expression
    ),

    receive_statement: $ => seq(
      $.expression_list,
      choice('=', ':='),
      $._expression
    ),

    inc_statement: $ => seq(
      $._expression,
      '++'
    ),

    dec_statement: $ => seq(
      $._expression,
      '--'
    ),

    assignment_statement: $ => seq(
      $.expression_list,
      token(seq(
        optional(choice(multiplicative_operator, additive_operator)),
        '='
      )),
      $.expression_list
    ),

    short_var_declaration: $ => seq(
      // TODO: this should really only allow identifier lists, but that causes
      // conflicts between identifiers as expressions vs identifiers here.
      $.expression_list,
      ':=',
      $.expression_list
    ),

    fallthrough_statement: $ => 'fallthrough',

    break_statement: $ => seq('break', optional($.identifier)),

    continue_statement: $ => 'continue',

    return_statement: $ => seq('return', optional($.expression_list)),

    go_statement: $ => seq('go', $._expression),

    defer_statement: $ => seq('defer', $._expression),

    if_statement: $ => seq(
      'if',
      optional(seq($._simple_statement, ';')),
      $._expression,
      $.block,
      optional(seq(
        'else',
        choice($.block, $.if_statement)
      ))
    ),

    for_statement: $ => seq(
      'for',
      optional(choice($._expression, $.for_clause, $.range_clause)),
      $.block
    ),

    for_clause: $ => seq(
      optional($._simple_statement),
      ';',
      optional($._expression),
      ';',
      optional($._simple_statement)
    ),

    range_clause: $ => seq(
      $.expression_list,
      choice('=', ':='),
      'range',
      $._expression
    ),

    expression_switch_statement: $ => seq(
      'switch',
      $._expression,
      '{',
      repeat($.expression_case_clause),
      '}'
    ),

    expression_case_clause: $ => seq(
      $.expression_case,
      ':',
      repeat(seq($._statement, terminator))
    ),

    expression_case: $ => choice(
      seq('case', $.expression_list),
      'default'
    ),

    type_switch_statement: $ => seq(
      'switch',
      optional(seq(
        $._simple_statement,
        ';'
      )),
      $._type_switch_guard,
      '{',
      repeat($.type_case_clause),
      '}'
    ),

    _type_switch_guard: $ => seq(
      optional(seq($.expression_list, ':=' )),
      $._expression, '.', '(', 'type', ')'
    ),

    type_case_clause: $ => seq(
      $.type_case,
      ':',
      repeat(seq($._statement, terminator))
    ),

    type_case: $ => choice(
      seq('case', commaSep1($._type)),
      'default'
    ),

    select_statement: $ => seq(
      'select',
      '{',
      repeat($.communication_clause),
      '}'
    ),

    communication_clause: $ => seq(
      $.communication_case,
      ':',
      repeat(seq($._statement, terminator))
    ),

    communication_case: $ => choice(
      seq('case', choice($.send_statement, $.receive_statement)),
      'default'
    ),

    _expression: $ => choice(
      $.unary_expression,
      $.binary_expression,
      $.selector_expression,
      $.index_expression,
      $.slice_expression,
      $.call_expression,
      $.make_expression,
      $.new_expression,
      $.type_assertion_expression,
      $.type_conversion_expression,
      $.identifier,
      $.composite_literal,
      $.func_literal,
      $._string_literal,
      $.int_literal,
      $.float_literal,
      seq('(', $._expression, ')')
    ),

    call_expression: $ => seq(
      $._expression,
      '(',
      optional($.expression_list),
      optional(seq('...', optional(','))),
      ')'
    ),

    make_expression: $ => seq(
      'make',
      '(',
      $._type,
      optional(seq(
        ',',
        $._expression
      )),
      ')'
    ),

    new_expression: $ => seq(
      'new',
      '(',
      $._type,
      ')'
    ),

    selector_expression: $ => seq(
      $._expression,
      '.',
      $.identifier
    ),

    index_expression: $ => seq(
      $._expression,
      '[',
      $._expression,
      ']'
    ),

    slice_expression: $ => seq(
      $._expression,
      '[',
      choice(
        seq(optional($._expression), ':', optional($._expression)),
        seq(optional($._expression), ':', $._expression, ':', $._expression)
      ),
      ']'
    ),

    type_assertion_expression: $ => seq(
      $._expression,
      '.',
      '(',
      $._type,
      ')'
    ),

    type_conversion_expression: $ => seq(
      $._type,
      '(',
      $._expression,
      optional(','),
      ')'
    ),

    composite_literal: $ => seq(
      choice(
        $.map_type,
        $.slice_type,
        $.struct_type,
        $.identifier
      ),
      $.literal_value
    ),

    literal_value: $ => seq(
      '{',
      optional($._element_list),
      '}'
    ),

    _element_list: $ => commaSepTrailing($._element_list, $.element),

    element: $ => seq(
      optional(seq(
        choice(
          $._expression,
          $.literal_value
        ),
        ':'
      )),
      choice(
        $._expression,
        $.literal_value
      )
    ),

    func_literal: $ => seq(
      'func',
      $.parameters,
      optional(choice($.parameters, $._type)),
      $.block
    ),

    unary_expression: $ => prec(PREC.unary, seq(
      choice('+', '-', '!', '^', '*', '&', '<-'),
      $._expression
    )),

    binary_expression: $ => choice(
      prec.left(PREC.multiplicative, seq($._expression, multiplicative_operator, $._expression)),
      prec.left(PREC.additive, seq($._expression, additive_operator, $._expression)),
      prec.left(PREC.comparative, seq($._expression, comparative_operator, $._expression)),
      prec.left(PREC.and, seq($._expression, and_operator, $._expression)),
      prec.left(PREC.or, seq($._expression, or_operator, $._expression))
    ),

    qualified_identifier: $ => seq(
      $.identifier,
      '.',
      $.identifier
    ),

    identifier: $ => token(seq(
      letter,
      repeat(choice(letter, unicodeDigit))
    )),

    _string_literal: $ => choice(
      $.raw_string_literal,
      $.interpreted_string_literal
    ),

    raw_string_literal: $ => token(seq(
      '`',
      repeat(/[^`\n]/),
      '`'
    )),

    interpreted_string_literal: $ => token(seq(
      '"',
      repeat(/[^"\n]/),
      '"'
    )),

    int_literal: $ => choice(decimalLiteral, octalLiteral, hexLiteral),

    float_literal: $ => token(choice(
      seq(decimals, '.', optional(decimals), optional(exponent)),
      seq(decimals, exponent),
      seq('.', decimals, optional(exponent))
    )),

    comment: $ => token(seq(
      '//',
      /.*/
    ))
  }
})

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}

function commaSepTrailing (recurSymbol, rule) {
  return choice(rule, seq(rule, ',', optional(recurSymbol)))
}
