import typescript from 'rollup-plugin-typescript2';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import pkg from './package.json';

const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.es6', '.es', '.mjs', '.jpg', '.png', '.svg'];
const EXTERNALS = [].concat(Object.keys(pkg.dependencies || {})).concat(Object.keys(pkg.peerDependencies || {}));
const EXTERNALS_REGEXP = new RegExp(`^(${EXTERNALS.join('|')})($|/)`);
const GLOBALS = EXTERNALS.reduce((acc, it) => (it.match(/^[a-z_$][a-z0-9_$]*$/) ? { ...acc, [it]: it } : acc), {});
const COMPRESS = false;
const COMMON = {
  external: id => EXTERNALS_REGEXP.test(id),
  treeshake: { propertyReadSideEffects: false },
};
const INPUT = 'src/index.tsx';
const OUTPUT = {
  globals: GLOBALS,
  strict: true,
  sourcemap: true,
  freeze: false,
  esModule: false,
  interop: 'auto',
  exports: 'auto',
  preserveModules: true,
};

export default [
  {
    ...COMMON,
    input: INPUT,
    output: { ...OUTPUT, dir: 'lib', format: 'cjs' },
    plugins: _getPlugins({ format: 'cjs', compress: COMPRESS }),
    watch: { exclude: 'node_modules/**' },
  },
  {
    ...COMMON,
    input: INPUT,
    output: { ...OUTPUT, dir: 'es', format: 'es' },
    plugins: _getPlugins({ format: 'es', compress: COMPRESS }),
    watch: false,
  },
];

function _getPlugins({ format, modern, compress }) {
  return [
    resolve({
      browser: true,
      mainFields: ['module', 'jsnext', 'main'],
      extensions: ['.mjs', '.js', '.jsx', '.json', '.node'],
    }),
    commonjs({ include: /\/node_modules\// }),
    typescript({
      check: false,
      clean: true,
      typescript: require('typescript'),
      cacheRoot: `./node_modules/.cache/.rts2_cache_${format}`,
      tsconfigDefaults: {
        compilerOptions: {
          sourceMap: true,
          declaration: true,
          jsx: 'react',
          jsxFactory: 'React.createElement',
        },
      },
      tsconfigOverride: { compilerOptions: { target: 'esnext' } },
    }),
    babel({
      exclude: 'node_modules/**',
      extensions: EXTENSIONS,
      babelHelpers: 'bundled',
      generatorOpts: {
        compact: compress,
        minified: compress,
        shouldPrintComment: comment => /[@#]__PURE__/.test(comment),
      },
      presets: [
        [
          modern ? '@babel/preset-modules' : '@babel/preset-env',
          {
            loose: true,
            modules: false,
            useBuiltIns: false,
            exclude: ['transform-async-to-generator', 'transform-regenerator'],
            targets: modern ? { esmodules: true } : undefined,
          },
        ],
      ],
      plugins: [
        ['@babel/plugin-transform-react-jsx', { pragma: 'React.createElement', pragmaFrag: 'Fragment' }],
        !modern && ['babel-plugin-transform-async-to-promises', { inlineHelpers: true, externalHelpers: true }],
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        '@babel/plugin-proposal-optional-chaining',
        'babel-plugin-pure-calls-annotation',
        ['@babel/plugin-proposal-class-properties', { loose: true }],
        !modern && ['@babel/transform-regenerator', { async: false }],
      ].filter(Boolean),
    }),
    compress &&
      terser({
        ecma: modern ? 2020 : 5,
        warnings: true,
        sourcemap: true,
        output: { wrap_func_args: false },
        toplevel: modern || format === 'cjs' || format === 'es',
        compress: { passes: 10, keep_infinity: true, pure_getters: true },
      }),
  ].filter(Boolean);
}
