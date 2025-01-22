import { computed, event } from "@potch/minifw";

export const filterEvent = (watcher, condition) => {
  const watchers = new Set();
  const [emit, watch] = event(watchers);
  let upstream = null;
  return (fn) => {
    const unwatch = watch(fn);
    if (!upstream) {
      upstream = watcher((data) => {
        if (condition(data)) {
          emit(data);
        }
      });
    }
    return () => {
      unwatch();
      if (!watchers.size) {
        upstream();
        upstream = null;
      }
    };
  };
};

export const signalMap = (s) =>
  Object.keys(s.val).reduce((o, key) => {
    const c = computed(() => s.val[key]);
    return Object.defineProperty(o, key, {
      get() {
        return c.val;
      },
    });
  }, {});
