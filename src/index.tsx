import React, { useEffect, useReducer, useRef, MouseEvent, createRef, RefObject, memo } from 'react';
import root from 'window-or-global';
import raf from 'raf';

const COUNT = root.performance && root.performance.memory ? 3 : 2;
const RATIO = Math.round(window.devicePixelRatio || 1);
const WIDTH = 80;
const HEIGHT = 48;
const CHART_WIDTH = WIDTH * RATIO;
const CHART_HEIGHT = HEIGHT * RATIO;
const TEXT_X = 3 * RATIO;
const TEXT_Y = 2 * RATIO;
const GRAPH_X = 3 * RATIO;
const GRAPH_Y = 15 * RATIO;
const GRAPH_WIDTH = 74 * RATIO;
const GRAPH_HEIGHT = 30 * RATIO;

export interface Props {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
}

function Monitor({ top = 0, right = 'auto', bottom = 'auto', left = 0 }: Props) {
  const [state, nextState] = useReducer(i => i + 1, 0);
  const nodes = useRef(createRefs(COUNT));

  useEffect(() => createHandler(nodes.current).subscribe(), []);

  const display = state % nodes.current.length;

  function render(ref: RefObject<HTMLCanvasElement>, index: number) {
    return (
      <canvas
        ref={ref}
        key={index}
        style={{ height: HEIGHT, width: WIDTH, display: index === display ? 'block' : 'none' }}
      />
    );
  }

  return (
    <div
      style={{
        top,
        right,
        bottom,
        left,
        zIndex: 999999,
        position: 'fixed',
        cursor: 'pointer',
        opacity: 0.9,
      }}
      onClick={(e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        nextState();
      }}
    >
      {nodes.current.map(render)}
    </div>
  );
}

function createRefs(count: number): RefObject<HTMLCanvasElement>[] {
  return Array(count)
    .fill(0)
    .map(() => createRef<HTMLCanvasElement>());
}

function createHandler(nodes: RefObject<HTMLCanvasElement>[]) {
  const _perf = root.performance;
  const _now = _perf && _perf.now ? _perf.now.bind(_perf) : Date.now.bind(Date);
  const _styles: [name: string, fg: string, bg: string][] = [
    ['FPS', '#0ff', '#002'],
    ['MS', '#0f0', '#002'],
    ['MB', '#0f0', '#020'],
  ];
  const _charts = nodes.map(({ current }, index) => createChart(current!, ..._styles[index])) as
    | [fps: Chart, ms: Chart]
    | [fps: Chart, ms: Chart, mb: Chart];

  let _frameId: number | null = null;
  let _frames = 0;
  let _start = _now();
  let _time = _start;

  function _update() {
    _frames++;
    const now = _now();
    _charts[1].update(now - _start, 200);
    if (now >= _time + 1000) {
      _charts[0].update((_frames * 1000) / (now - _time), 100);
      _time = now;
      _frames = 0;
      if (_charts.length === 3) {
        _charts[2].update(_perf.memory!.usedJSHeapSize / 1048576, _perf.memory!.jsHeapSizeLimit / 1048576);
      }
    }
    _start = now;
  }

  function _schedule() {
    _frameId = raf(_onFrame);
  }

  function _interrupt() {
    if (_frameId != null) raf.cancel(_frameId);
  }

  function _onFrame() {
    _update();
    _schedule();
  }

  return {
    subscribe() {
      _schedule();
      return function unsubscribe() {
        _interrupt();
      };
    },
  };
}

interface Chart {
  update(value: number, maxValue: number): void;
}

function createChart(canvas: HTMLCanvasElement, name: string, fg: string, bg: string): Chart {
  let _min = Infinity;
  let _max = 0;

  canvas.width = CHART_WIDTH;
  canvas.height = CHART_HEIGHT;

  const context = canvas.getContext('2d');
  if (context) {
    context.font = 'bold ' + 9 * RATIO + 'px Helvetica,Arial,sans-serif';
    context.textBaseline = 'top';
    context.fillStyle = bg;
    context.fillRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
    context.fillStyle = fg;
    context.fillText(name, TEXT_X, TEXT_Y);
    context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);
    context.fillStyle = bg;
    context.globalAlpha = 0.9;
    context.fillRect(GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT);
  }

  function _getText(value: number) {
    return Math.round(value) + ' ' + name + ' (' + Math.round(_min) + '-' + Math.round(_max) + ')';
  }

  return {
    update(value: number, maxValue: number) {
      _min = Math.min(_min, value);
      _max = Math.max(_max, value);
      if (context) {
        context.fillStyle = bg;
        context.globalAlpha = 1;
        context.fillRect(0, 0, CHART_WIDTH, GRAPH_Y);
        context.fillStyle = fg;
        context.fillText(_getText(value), TEXT_X, TEXT_Y);
        context.drawImage(
          canvas,
          GRAPH_X + RATIO,
          GRAPH_Y,
          GRAPH_WIDTH - RATIO,
          GRAPH_HEIGHT,
          GRAPH_X,
          GRAPH_Y,
          GRAPH_WIDTH - RATIO,
          GRAPH_HEIGHT,
        );
        context.fillRect(GRAPH_X + GRAPH_WIDTH - RATIO, GRAPH_Y, RATIO, GRAPH_HEIGHT);
        context.fillStyle = bg;
        context.globalAlpha = 0.9;
        context.fillRect(
          GRAPH_X + GRAPH_WIDTH - RATIO,
          GRAPH_Y,
          RATIO,
          Math.round((1 - value / maxValue) * GRAPH_HEIGHT),
        );
      }
    },
  };
}

export default memo(Monitor);
