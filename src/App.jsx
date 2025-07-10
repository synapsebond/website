import { useState } from 'react'
import reactLogo from './assets/react.svg'
import './index.scss'
import './App.scss'

import NavBar from './components/NavBar.jsx'
import MainApp from './components/MainApp.jsx'

function App() {
  return (
    <>
      <NavBar />
      <MainApp />
    </>
  )
}

export default App
