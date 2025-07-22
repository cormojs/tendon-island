import Versions from './components/Versions'
import electronLogo from './assets/electron.svg'

function App(): React.JSX.Element {
  const ipcHandle1 = (): void => {
    window.electron.ipcRenderer.send('ping')
    window.electron.ipcRenderer.send('show-toast', "test")
  }

  const ipcHandle2 = () => {
    console.log("test")
    window.electron.ipcRenderer.send("set-message", "test message")
  }

  return (
    <>
      <img alt="logo" className="logo" src={electronLogo} />
      <div className="creator">Powered by electron-vite</div>
      <div className="text">
        Build an Electron app with <span className="react">React</span>
        &nbsp;and <span className="ts">TypeScript</span>
      </div>
      <p className="tip">
        Please try pressing <code>F12</code> to open the devTool
      </p>
      <div className="actions">
        <div className="action">
          <a href="https://electron-vite.org/" target="_blank" rel="noreferrer">
            Documentation
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle1}>
            Send IPC
          </a>
        </div>
        <div className="action">
          <a target="_blank" rel="noreferrer" onClick={ipcHandle2}>
            Add IPC
          </a>
        </div>
      </div>
      <Versions></Versions>
    </>
  )
}

export default App
