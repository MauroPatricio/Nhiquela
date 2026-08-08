import('./services/dispatchService.js').then((module) => {
  console.log("Success:", module.default !== undefined);
}).catch(err => {
  console.error("Error:", err);
});
