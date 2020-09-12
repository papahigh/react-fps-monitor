import typescript from 'rollup-plugin-typescript2';
import _ from 'lodash';
import babel from '@rollup/plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';
import filesize from 'rollup-plugin-filesize';
import pkg from './package.json';

const COMPRESS = false;
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.es6', '.es', '.mjs', '.jpg', '.png', '.svg'];
const DEPENDENCIES = [].concat(Object.keys(pkg.peerDependencies || {})).concat(Object.keys(pkg.dependencies || {}));
const EXTERNALS = DEPENDENCIES.concat(/@babel\/runtime/);
const GLOBALS = DEPENDENCIES.reduce(
  (acc, it) => (it.match(/^[a-z_$][a-z0-9_$]*$/) ? { ...acc, [it]: _.capitalize(_.camelCase(it)) } : acc),
  {},
);
const OUTPUT = {
  globals: GLOBALS,
  strict: true,
  sourcemap: true,
  freeze: false,
  esModule: false,
  interop: 'auto',
  exports: 'auto',
};
const INPUT = 'src/index.tsx';

export default [
  {
    input: INPUT,
    output: { ...OUTPUT, dir: 'lib', format: 'cjs' },
    plugins: _getPlugins({ format: 'cjs', compress: COMPRESS }),
    external: EXTERNALS,
    treeshake: false,
    watch: { exclude: 'node_modules/**' },
  },
  {
    input: INPUT,
    output: { ...OUTPUT, dir: 'es', format: 'es' },
    plugins: _getPlugins({ format: 'es', compress: COMPRESS }),
    external: EXTERNALS,
    treeshake: false,
    watch: false,
  },
  {
    input: INPUT,
    output: { ...OUTPUT, dir: 'es2020', format: 'es' },
    plugins: _getPlugins({ format: 'es2020', modern: true, compress: COMPRESS }),
    external: EXTERNALS,
    treeshake: false,
    watch: false,
  },
];

function _getPlugins({ format, modern, compress }) {
  return [
    typescript({
      check: true,
      clean: true,
      typescript: require('typescript'),
      cacheRoot: `./node_modules/.cache/.rts2_cache_${format}`,
      tsconfigOverride: { compilerOptions: { target: 'esnext' } },
    }),
    babel({
      exclude: 'node_modules/**',
      extensions: EXTENSIONS,
      babelHelpers: 'runtime',
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
            targets: modern ? { esmodules: true } : undefined,
          },
        ],
        '@babel/preset-react',
      ],
      ignore: ['node_modules/**'],
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-optional-chaining',
        'babel-plugin-pure-calls-annotation',
      ],
    }),
    resolve({
      browser: true,
      mainFields: ['module', 'jsnext', 'main'],
      extensions: ['.mjs', '.js', '.jsx', '.json', '.node'],
    }),
    commonjs(),
    compress &&
      terser({
        ecma: modern ? 2020 : 5,
        warnings: true,
        sourcemap: true,
        output: { wrap_func_args: false },
        toplevel: modern || format === 'cjs' || format === 'es',
        compress: { passes: 10, keep_infinity: true, pure_getters: true },
      }),
    filesize(),
  ].filter(Boolean);
}
