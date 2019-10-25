import React from 'react';
import ReactDOM from 'react-dom';

import { App } from './App';
import { initializeGlobalState } from './services/storage';

initializeGlobalState();
ReactDOM.render(<App/>, document.getElementById('root'));