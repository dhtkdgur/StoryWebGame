import React, { useState, useEffect } from 'react'

const StoryScreen = ({ gameState, socket }) => {
  const [round, setRound] = useState(1)
  const [totalRounds, setTotalRounds] = useState(12)
  const [timeLeft, setTimeLeft] = useState(30)
  const [storyText, setStoryText] = useState('')
  const [storySoFar, setStorySoFar] = useState('')
  const [prompts, setPrompts] = useState([])
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    if (socket) {
      socket.on('story:timer', ({ secondsLeft }) => {
        setTimeLeft(secondsLeft)
      })

      socket.on('story:round', (payload) => {
        setRound(payload.round)
        setTotalRounds(payload.totalRounds)
        setStorySoFar(payload.storySoFar)
        setPrompts(payload.prompts)
        setSubmitted(false)
        setStoryText('')
      })
    }
  }, [socket])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleSubmitStory = () => {
    if (socket) {
      socket.emit('story:submit', { text: storyText }, (res) => {
        if (res.ok) {
          setSubmitted(true)
        }
      })
    }
  }

  return (
    <section id="screen-story" className="screen">
      <div className="story-layout">
        <div id="players-left" className="player-sidebar player-sidebar-left"></div>

        <div className="story-main">
          <div 
            className="notebook-panel"
            style={{
              backgroundImage: round === 1 
                ? "url('./image/04_스토리 적기/Note_Asset_round_01.png')"
                : "url('./image/04_스토리 적기/공책.png')"
            }}
          >
            <div className="notebook-header">
              <div className="round-info">
                {round} / {totalRounds}
              </div>
              <div className="timer-info">
                {timeLeft}s
              </div>
            </div>

            <div className="notebook-body">
              <div id="story-so-far" className="story-so-far-text">
                {storySoFar}
              </div>

              <div id="my-inbox-prompts" className="sticky-note-container">
                {prompts.map((prompt, index) => (
                  <div key={index} className="sticky-note">{prompt}</div>
                ))}
              </div>
            </div>

            {!submitted ? (
              <div className="notebook-footer">
                <div className="input-area-wrapper">
                  <span className="quote-mark left">"</span>
                  <div className="input-bg-container">
                    <img src="./image/04_스토리 적기/입력란.png" alt="입력란" className="input-line-img" />
                    <textarea
                      id="input-story-text"
                      rows="2"
                      placeholder="여기에 문장을 입력하세요"
                      value={storyText}
                      onChange={(e) => setStoryText(e.target.value)}
                    />
                  </div>
                  <span className="quote-mark right">"</span>
                  <button id="btn-submit-story" className="plane-submit-btn" onClick={handleSubmitStory}>
                    <img src="./image/04_스토리 적기/제출.png" alt="제출" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="notebook-footer">
                <p>다른 플레이어들을 기다리는 중...</p>
              </div>
            )}
          </div>
        </div>

        <div id="players-right" className="player-sidebar player-sidebar-right"></div>
      </div>
    </section>
  )
}

export default StoryScreen
