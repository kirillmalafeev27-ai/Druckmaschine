function settleAll(promises) {
  return Promise.all((promises || []).map((promise) =>
    Promise.resolve(promise).then(
      (value) => ({ status: 'fulfilled', value }),
      (reason) => ({ status: 'rejected', reason })
    )
  ));
}

function objectEntries(object) {
  return Object.keys(object).map((key) => [key, object[key]]);
}
