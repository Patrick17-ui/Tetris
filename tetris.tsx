"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Music } from "lucide-react"

// Définition des pièces de Tetris avec leurs formes et couleurs
const TETROMINOS = {
  I: { shape: [[1, 1, 1, 1]], color: "bg-cyan-500" },
  J: {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
    ],
    color: "bg-blue-500",
  },
  L: {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
    ],
    color: "bg-orange-500",
  },
  O: {
    shape: [
      [1, 1],
      [1, 1],
    ],
    color: "bg-yellow-500",
  },
  S: {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
    ],
    color: "bg-green-500",
  },
  T: {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
    ],
    color: "bg-purple-500",
  },
  Z: {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
    ],
    color: "bg-red-500",
  },
}

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const INITIAL_DROP_TIME = 800
const SPEED_INCREASE_FACTOR = 0.95

// Création d'un plateau de jeu vide
const createEmptyBoard = () => Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0))

// Sélection aléatoire d'une pièce de Tetris
const randomTetromino = () => {
  const keys = Object.keys(TETROMINOS)
  const randKey = keys[Math.floor(Math.random() * keys.length)]
  return { ...TETROMINOS[randKey], name: randKey }
}

export default function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard())
  const [currentPiece, setCurrentPiece] = useState(null)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [dropTime, setDropTime] = useState(INITIAL_DROP_TIME)
  const [level, setLevel] = useState(1)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [completedRows, setCompletedRows] = useState([])
  const audioRef = useRef(null)
  const dropInterval = useRef(null)

  // Vérification des collisions
  const checkCollision = (x, y, shape) => {
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col] !== 0) {
          const newX = x + col
          const newY = y + row
          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && board[newY] && board[newY][newX] !== 0)
          ) {
            return true
          }
        }
      }
    }
    return false
  }

  const isValidMove = (x, y, shape) => !checkCollision(x, y, shape)

  // Déplacement vers la gauche
  const moveLeft = useCallback(() => {
    if (currentPiece && isValidMove(currentPiece.x - 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, x: prev.x - 1 }))
    }
  }, [currentPiece, board])

  // Déplacement vers la droite
  const moveRight = useCallback(() => {
    if (currentPiece && isValidMove(currentPiece.x + 1, currentPiece.y, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, x: prev.x + 1 }))
    }
  }, [currentPiece, board])

  // Déplacement vers le bas
  const moveDown = useCallback(() => {
    if (!currentPiece) return
    if (isValidMove(currentPiece.x, currentPiece.y + 1, currentPiece.tetromino.shape)) {
      setCurrentPiece((prev) => ({ ...prev, y: prev.y + 1 }))
    } else {
      placePiece()
    }
  }, [currentPiece, board])

  // Rotation de la pièce
  const rotate = useCallback(() => {
    if (!currentPiece) return

    // Calcul de la rotation
    const rotated = currentPiece.tetromino.shape[0].map((_, i) =>
      currentPiece.tetromino.shape.map((row) => row[i]).reverse(),
    )

    let newX = currentPiece.x
    let newY = currentPiece.y

    // Essayer de tourner, si impossible, ajuster la position
    if (!isValidMove(newX, newY, rotated)) {
      // Essayer de déplacer à gauche
      if (isValidMove(newX - 1, newY, rotated)) {
        newX -= 1
      }
      // Essayer de déplacer à droite
      else if (isValidMove(newX + 1, newY, rotated)) {
        newX += 1
      }
      // Essayer de déplacer vers le haut
      else if (isValidMove(newX, newY - 1, rotated)) {
        newY -= 1
      }
      // Si toujours impossible, ne pas tourner
      else {
        return
      }
    }

    setCurrentPiece((prev) => ({
      ...prev,
      x: newX,
      y: newY,
      tetromino: { ...prev.tetromino, shape: rotated },
    }))
  }, [currentPiece, board])

  // Placement de la pièce sur le plateau
  const placePiece = useCallback(() => {
    if (!currentPiece) return

    const newBoard = [...board.map((row) => [...row])]

    currentPiece.tetromino.shape.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value !== 0) {
          const boardY = y + currentPiece.y
          const boardX = x + currentPiece.x

          if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            newBoard[boardY][boardX] = currentPiece.tetromino.color
          }
        }
      })
    })

    setBoard(newBoard)
    checkCompletedRows(newBoard)
    spawnNewPiece()
  }, [currentPiece, board])

  // Vérification et suppression des lignes complètes
  const checkCompletedRows = useCallback(
    (boardToCheck) => {
      const completedRowIndices = []

      boardToCheck.forEach((row, index) => {
        if (row.every((cell) => cell !== 0)) {
          completedRowIndices.push(index)
        }
      })

      if (completedRowIndices.length > 0) {
        setCompletedRows(completedRowIndices)

        setTimeout(() => {
          const newBoard = boardToCheck.filter((_, index) => !completedRowIndices.includes(index))

          // Ajouter de nouvelles lignes vides en haut
          while (newBoard.length < BOARD_HEIGHT) {
            newBoard.unshift(Array(BOARD_WIDTH).fill(0))
          }

          setBoard(newBoard)
          setCompletedRows([])

          // Mise à jour du score et du niveau
          const newScore = score + completedRowIndices.length * 100 * level
          setScore(newScore)

          if (Math.floor(newScore / 500) > level - 1) {
            setLevel((prev) => prev + 1)
            setDropTime((prev) => prev * SPEED_INCREASE_FACTOR)
          }
        }, 300)
      }
    },
    [score, level],
  )

  // Génération d'une nouvelle pièce
  const spawnNewPiece = useCallback(() => {
    const newTetromino = randomTetromino()
    const newPiece = {
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(newTetromino.shape[0].length / 2),
      y: 0,
      tetromino: newTetromino,
    }

    if (checkCollision(newPiece.x, newPiece.y, newPiece.tetromino.shape)) {
      setGameOver(true)
    } else {
      setCurrentPiece(newPiece)
    }
  }, [board])

  // Génération de la première pièce au démarrage
  useEffect(() => {
    if (!currentPiece && !gameOver) {
      spawnNewPiece()
    }
  }, [currentPiece, gameOver, spawnNewPiece])

  // Gestion de la chute automatique des pièces
  useEffect(() => {
    if (!gameOver) {
      clearInterval(dropInterval.current)
      dropInterval.current = setInterval(moveDown, dropTime)
    }
    return () => clearInterval(dropInterval.current)
  }, [moveDown, gameOver, dropTime])

  // Gestion des contrôles clavier
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (gameOver) return

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault()
          moveLeft()
          break
        case "ArrowRight":
          e.preventDefault()
          moveRight()
          break
        case "ArrowDown":
          e.preventDefault()
          moveDown()
          break
        case "ArrowUp":
          e.preventDefault()
          rotate()
          break
        case " ": // Espace pour chute rapide
          e.preventDefault()
          // Implémentation de la chute rapide
          const dropToBottom = () => {
            if (!currentPiece) return
            let newY = currentPiece.y

            while (isValidMove(currentPiece.x, newY + 1, currentPiece.tetromino.shape)) {
              newY += 1
            }

            if (newY !== currentPiece.y) {
              setCurrentPiece((prev) => ({ ...prev, y: newY }))
              placePiece()
            }
          }
          dropToBottom()
          break
        default:
          break
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [moveLeft, moveRight, moveDown, rotate, gameOver, currentPiece, placePiece])

  // Gestion de la musique
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.3
      audioRef.current.loop = true

      if (!gameOver && isMusicPlaying) {
        audioRef.current.play().catch((error) => console.error("Audio playback failed:", error))
      } else {
        audioRef.current.pause()
      }
    }
  }, [gameOver, isMusicPlaying])

  // Réinitialisation du jeu
  const resetGame = () => {
    setBoard(createEmptyBoard())
    setCurrentPiece(null)
    setScore(0)
    setGameOver(false)
    setDropTime(INITIAL_DROP_TIME)
    setLevel(1)
    setCompletedRows([])
    clearInterval(dropInterval.current)
  }

  // Rendu d'une cellule du plateau
  const renderBoard = () => {
    // Créer une copie du plateau pour l'affichage
    const displayBoard = board.map((row) => [...row])

    // Ajouter la pièce courante au plateau d'affichage
    if (currentPiece) {
      currentPiece.tetromino.shape.forEach((row, y) => {
        row.forEach((value, x) => {
          if (value !== 0) {
            const boardY = y + currentPiece.y
            const boardX = x + currentPiece.x

            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPiece.tetromino.color
            }
          }
        })
      })
    }

    return displayBoard.map((row, y) =>
      row.map((cell, x) => (
        <motion.div
          key={`${y}-${x}`}
          initial={false}
          animate={{
            opacity: completedRows.includes(y) ? 0 : 1,
            scale: completedRows.includes(y) ? 1.1 : 1,
          }}
          transition={{ duration: 0.2 }}
          className={`w-5 h-5 ${cell || "bg-gray-100"}`}
          style={{ border: "1px solid #e5e7eb" }}
        />
      )),
    )
  }

  // Activation/désactivation de la musique
  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying)
  }

  // Contrôles tactiles pour mobile
  const handleTouchLeft = () => {
    if (!gameOver) moveLeft()
  }

  const handleTouchRight = () => {
    if (!gameOver) moveRight()
  }

  const handleTouchRotate = () => {
    if (!gameOver) rotate()
  }

  const handleTouchDown = () => {
    if (!gameOver) moveDown()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-4xl font-bold mb-4">Tetris</h1>

      <div className="bg-white p-4 rounded-lg shadow-lg">
        <div
          className="grid bg-gray-300"
          style={{
            gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)`,
            width: `${BOARD_WIDTH * 20}px`,
            height: `${BOARD_HEIGHT * 20}px`,
            border: "1px solid #e5e7eb",
          }}
        >
          {renderBoard()}
        </div>
      </div>

      <div className="mt-4 text-xl font-bold">Score: {score}</div>
      <div className="mt-2 text-lg">Niveau: {level}</div>

      {gameOver && <div className="mt-4 text-2xl font-bold text-red-600">Game Over!</div>}

      <div className="flex gap-4 mt-4">
        <Button onClick={resetGame}>{gameOver ? "Rejouer" : "Recommencer"}</Button>
        <Button onClick={toggleMusic}>
          <Music className="w-4 h-4 mr-2" />
          {isMusicPlaying ? "Arrêter Musique" : "Jouer Musique"}
        </Button>
      </div>

      {/* Contrôles tactiles pour mobile */}
      <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-xs md:hidden">
        <Button onClick={handleTouchLeft} className="h-12">
          ←
        </Button>
        <Button onClick={handleTouchRotate} className="h-12">
          ↑
        </Button>
        <Button onClick={handleTouchRight} className="h-12">
          →
        </Button>
        <div className="col-span-3">
          <Button onClick={handleTouchDown} className="w-full h-12">
            ↓
          </Button>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Contrôles: Flèches directionnelles pour déplacer</p>
        <p>Flèche du haut pour tourner, Espace pour chute rapide</p>
      </div>

      <audio
        ref={audioRef}
        src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Tetris-kxnh5j7hpNEcFspAndlU2huV5n6dvk.mp3"
      />
    </div>
  )
}
