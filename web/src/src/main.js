import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'

function init() {
  mount(App, {
    target: document.getElementById('app'),
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
