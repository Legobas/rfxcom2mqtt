'use strict';

import Controller from './libs/Controller';

let controller: Controller;
let stopping = false;

function exit(code: number, restart: boolean = false) {
  if (!restart) {
      process.exit(code);
  }
}

async function start() {
  controller = new Controller(exit)
  await controller.start()
}


function handleQuit() {
  if (!stopping && controller) {
      stopping = true;
      controller.stop(false);
  }
}

process.on('SIGINT', handleQuit);
process.on('SIGTERM', handleQuit);
start();