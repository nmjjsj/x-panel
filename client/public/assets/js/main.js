// Dom Selectors
const $id = sel => document.getElementById(sel)
const $cl = sel => document.getElementsByClassName(sel)
const $all = sel => document.querySelectorAll(sel)

// ELements
let connState = $id('conn-state'),
  btnGroup = $cl('btn-group')[0],
  fileSystem = $cl('file-system')[0],
  files = $id('files'),
  menu = $cl('menu')[0],
  menuOption = $all('.menu-option'),
  title = $id('title'),
  currPing = $id('curr-ping'),
  status = $id('status'),
  cpuUsage = $id('cpu-usage'),
  upTime = $id('up-time'),
  memoryUsage = $id('memory-usage')

let pingTime
let menuVisible = false
let selectedFile
let editMode = false

//File Manager Functions
const toggleEditor = command => {
  files.style.display = command === 'show' ? 'none' : 'block'
  $id('file-editor').style.display = command === 'show' ? 'block' : 'none'
  editMode = command === 'show' ? true : false
}
const toggleMenu = command => {
  menu.style.display = command === 'show' ? 'block' : 'none'
  menuVisible = !menuVisible
}

const toggleFileSystem = command => {
  if (command === 'show') {
    socket.emit('read-dir')
    title.style.margin = '6vh 0'
    $cl('content')[0].style.justifyContent = 'flex-start'
    btnGroup.style.display = 'none'
    fileSystem.style.display = 'flex'
    $id('prev-dir').addEventListener('click', () =>
      editMode ? toggleEditor('hide') : socket.emit('prev-dir')
    )
    title.innerHTML += ' - <span>File Manager</span>'
  } else {
    title.style.margin = '0 0 3vh 0'
    $cl('content')[0].style.justifyContent = 'center'
    fileSystem.style.display = 'none'
    btnGroup.style.display = 'flex'
  }
}

window.addEventListener('click', e => {
  if (menuVisible) toggleMenu('hide')
})

const setPosition = ({ top, left }) => {
  menu.style.left = `${left}px`
  menu.style.top = `${top}px`
  toggleMenu('show')
}
//END

//Handler for all Buttons
const handleBtn = btn => {
  switch (btn) {
    case 'reboot':
      const logOffPw = window.prompt('Password')
      socket.emit('reboot', logOffPw)
      break
    case 'turn-off':
      const turnOffPw = window.prompt('Password')
      socket.emit('turn-off', turnOffPw)
      break
    case 'file-system':
      toggleFileSystem('show')
      break
  }
}
//END

//Button Listener
$all('button').forEach(btn =>
  btn.addEventListener('click', () => handleBtn(btn.id))
)

// Home Button listener
title.addEventListener('click', () => {
  toggleFileSystem('hide')
  title.innerHTML = '<span>X</span> Panel'
})

// Context Menu Buttons Listener/Handler
fileSystem.addEventListener('contextmenu', e => {
  e.preventDefault()
  return false
})

menuOption.forEach(opt =>
  opt.addEventListener('click', e => {
    switch (opt.innerText) {
      case 'Edit':
        socket.emit('edit-file', selectedFile)
        break
      case 'Download':
        socket.emit('download-file', selectedFile)
        break
    }
  })
)

// All incomming sockets
const socket = io()
  .on('os-info', info => {
    cpuUsage.innerText = `${info.cpuUsage}%`
    memoryUsage.innerText = `${(100 - info.memory.freeMemPercentage).toFixed(
      2
    )}%`
    const minutes = Math.floor(info.upTime / 60)
    const seconds = (info.upTime - minutes * 60).toFixed(0)
    upTime.innerText = `${minutes}m ${seconds}s`
  })

  .on('pong', () => (currPing.innerText = `${Date.now() - pingTime}ms`))

  .on('dir-items', items => {
    files.innerHTML = ''
    if (!items.length)
      return (files.innerHTML =
        '<div class="dir-item">This folder seems to be empty...</div>')
    items.map(
      item =>
        (files.innerHTML += `
        <div 
            dir-item-name="${item.name}" 
            is-file="${item.isFile}" 
            class="dir-item">
        ${
          item.isFile
            ? '<i class="far fa-file-alt"></i>'
            : '<i class="far fa-folder"></i>'
        } 
        ${item.name}
        </div>`)
    )
    $all('.dir-item[is-file="false"]').forEach(btn =>
      btn.addEventListener('click', () =>
        socket.emit('read-dir', btn.getAttribute('dir-item-name'))
      )
    )
    $all('.dir-item[is-file="true"]').forEach(itm =>
      itm.addEventListener('contextmenu', e => {
        if (e.target === itm) selectedFile = itm.innerText.trim()
        const origin = {
          left: e.pageX,
          top: e.pageY
        }
        setPosition(origin)
      })
    )
  })

  .on('file-content', content => {
    toggleEditor('show')
    $id('file-editor').value = content
    //Log Reader
    content.split('\n').forEach(line => {
      console.log(line.split(' ')[1])
    })
  })

  .on('download-start', dir => {
    $id('exec-download').setAttribute('href', dir)
    $id('exec-download').click()
  })

  .on('connect', () => {
    connState.innerText = 'Connected'
    status.style.borderColor = '#35df90'
    setInterval(() => {
      socket.emit('ping')
      pingTime = Date.now()
    }, 2000)
  })

  .on('disconnect', () => {
    connState.innerText = 'Disconnected'
    status.style.borderColor = '#f47961'
  })
//END
