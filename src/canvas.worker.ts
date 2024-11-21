onmessage = function (event) {
  if (event.data.type === 'ping') {
    console.log('Received message from main thread:', event.data);

    // Perform some heavy computation
    const result = event.data * 2;

    // Send the result back to the main thread
    postMessage(result);
  }
};
