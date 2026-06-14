import app from '../src/app.js';

const routes = [];

function split(thing) {
  if (typeof thing === 'string') {
    return thing.split('/');
  } else if (thing.fast_slash) {
    return '';
  } else {
    var match = thing.toString()
      .replace('\\/?$', '')
      .replace('(?=\\/|$)', '')
      .match(/^\/\^((?:\\[.*+?^${}()|[\]\\\/]|[^.*+?^${}()|[\]\\\/])*)\$\//);
    return match
      ? match[1].replace(/\\(.)/g, '$1').split('/')
      : thing.toString();
  }
}

function walk(path, layer) {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).map(m => m.toUpperCase());
    methods.forEach(method => {
      routes.push({
        method,
        path: (path + (layer.route.path || '')).replace(/\/+/g, '/').replace(/\/$/, '') || '/'
      });
    });
  } else if (layer.name === 'router' && layer.handle.stack) {
    const routerPath = split(layer.regexp);
    const resolvedPath = Array.isArray(routerPath) ? routerPath.join('/') : '';
    layer.handle.stack.forEach(subLayer => {
      walk(path + '/' + resolvedPath, subLayer);
    });
  }
}

app._router.stack.forEach(layer => {
  walk('', layer);
});

// Remove duplicates and sort
const uniqueRoutes = routes.filter((v, i, a) => a.findIndex(t => t.path === v.path && t.method === v.method) === i);
uniqueRoutes.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

console.log(JSON.stringify(uniqueRoutes, null, 2));
console.log(`\nTotal registered routes: ${uniqueRoutes.length}`);
