/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

const regexpTree = require('..');

describe('regexp-tree', () => {

  it('API', () => {
    // Parser.
    expect(typeof regexpTree.parser).toBe('object');
    expect(typeof regexpTree.parse).toBe('function');

    // Traverse.
    expect(typeof regexpTree.traverse).toBe('function');

    // Transform.
    expect(typeof regexpTree.transform).toBe('function');

    // Generator.
    expect(typeof regexpTree.generate).toBe('function');

    // Create RegExp objects.
    expect(typeof regexpTree.toRegExp).toBe('function');

    // Optimizer.
    expect(typeof regexpTree.optimize).toBe('function');
  });

  it('operations', () => {
    const re = '/a/i';
    const ast = regexpTree.parse(re);

    // 1. Parse.
    expect(ast).toEqual({
      type: 'RegExp',
      body: {
        type: 'Char',
        value: 'a',
        kind: 'simple',
      },
      flags: 'i',
    });

    // 2. Traverse.
    const visited = [];

    regexpTree.traverse(ast, {
      RegExp({node}) {
        visited.push(node.type);
        expect(node.type).toBe('RegExp');
      },

      Char({node}) {
        visited.push(node.type);
        expect(node.type).toBe('Char');
        expect(node.value).toBe('a');
      }
    });

    expect(visited).toEqual([
      'RegExp',
      'Char',
    ]);

    // 3. Generate.
    expect(regexpTree.generate(ast)).toBe(re);

  });

  it('creates RegExp', () => {
    const reStr = '/[a-z]/i';
    const re = regexpTree.toRegExp(reStr);

    expect(re).toBeInstanceOf(RegExp);
    expect(re.toString()).toBe(reStr);

    expect(re.test('a')).toBe(true);
    expect(re.test('Z')).toBe(true);
  });

  it('calls `ToString` in `parse`', () => {
    const reStr = '/m/m';
    const ast = regexpTree.parse({toString: () => reStr});
    expect(regexpTree.generate(ast)).toBe(reStr);
  });

  it('optimizer', () => {
    expect(regexpTree.optimize('/aa*/').toString()).toBe('/a+/');
  });

});