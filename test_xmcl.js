const xmcl = require('@xmcl/installer');
console.log(Object.keys(xmcl).filter(k => k.includes('Fabric') || k.includes('Forge') || k.includes('Quilt')));
