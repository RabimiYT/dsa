// OCRライブラリ突っ込む
const script = document.createElement('script')
script.src =
  'https://unpkg.com/tesseract.js@v2.0.0-alpha.16/dist/tesseract.min.js'
script.onload = () => {
  // キー入力の模倣をする
  function sendKey(key) {
    const event = new KeyboardEvent('keypress', { charCode: key.charCodeAt() })
    document.dispatchEvent(event)
  }
  // キー入力を同期でやると処理が早すぎてうまく行かないので入力を遅延させる
  async function sendKeys(keys, { inputDelay = DELAY_KEYINPUT } = {}) {
    return new Promise(resolve => {
      keys.split('').forEach((c, i) => {
        setTimeout(() => {
          sendKey(c)
          if (i + 1 === lastParsed.length) {
            resolve(keys)
          }
        }, inputDelay * i)
      })
    })
  }

  const DELAY_KEYINPUT = 10
  const INTERVAL_OCR = 200
  const WIDTH_ROMAJI_AREA = 440
  const HEIGHT_ROMAJI_AREA = 30
  const X_ROMAJI_AREA = 30
  const Y_ROMAJI_AREA = 230
  const worker = new Tesseract.TesseractWorker({
    tessedit_char_whitelist: '!?,-abcdefghijklmnopqrstuvwxyz01234567890',
  })
  const canvas = document.querySelector('canvas')
  const gl = canvas.getContext('webgl2')
  const bufferCanvas = document.createElement('canvas')
  const bufferContext = bufferCanvas.getContext('2d')
  let updating = false
  let lastParsed = null

  bufferCanvas.width = WIDTH_ROMAJI_AREA
  bufferCanvas.height = HEIGHT_ROMAJI_AREA

  setInterval(() => {
    if (updating) {
      return
    }
    bufferContext.drawImage(
      gl.canvas, // drawImageにはHTMLCanvasElementが渡せる
      // gl.canvasのこの領域を、
      X_ROMAJI_AREA,
      Y_ROMAJI_AREA,
      WIDTH_ROMAJI_AREA,
      HEIGHT_ROMAJI_AREA,
      // コピー用キャンバスのこの領域に描画
      0,
      0,
      WIDTH_ROMAJI_AREA,
      HEIGHT_ROMAJI_AREA
    )
    worker
      .recognize(bufferCanvas)
      .then(r => {
        // セリフの枠が`|`とか`iE`とかパースされるので、`| hogehoge |`のhogehogeだけパースしてくる正規表現
        // まぁ4文字以下ならパース失敗してるだろうからミス入力を減らすためにガード入れておく（4文字以下の入力が来たときに回答できないがそれは見過ごす）
        const matched = r.text.match(/([a-z-,!?]{4,})/)
        if (!matched) {
          console.warn(`recognition failed: ${r.text}`, r)
          return
        }

        // 多重入力を防ぐためガードしておく
        if (matched[1] === lastParsed) {
          console.warn(`already parsed: ${matched[1]}`)
          return
        }
        updating = true
        lastParsed = matched[1]
        console.log(`Will input: ${lastParsed}`)
        sendKeys(lastParsed)
          .then(inputted => console.log(`completed: ${inputted}`))
          .finally(() => {
            updating = false
          })
      })
      .catch(console.error)
  }, INTERVAL_OCR)
}
document.body.appendChild(script)
