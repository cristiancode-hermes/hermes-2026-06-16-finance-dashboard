// Polyfill jasmine.createSpyObj for Vitest compatibility
import { vi } from 'vitest';

(globalThis as any).jasmine = {
  createSpyObj: (name: string, methods: string[]) => {
    const obj: Record<string, any> = {};
    for (const method of methods) {
      const fn = vi.fn() as any;
      fn.and = {
        returnValue: (val: any) => {
          fn.mockReturnValue(val);
          return fn;
        },
        callThrough: () => {
          fn.mockImplementation((...args: any[]) => args);
          return fn;
        },
      };
      obj[method] = fn;
    }
    return obj;
  },
};
