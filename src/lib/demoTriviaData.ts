// Demo data for Saturday Trivia preview
export const DEMO_TRIVIA_DATA = {
  session: {
    id: 'demo-session',
    week_key: '2025-10-18',
    topics: ['General Knowledge', 'Science', 'History'],
    session_1_questions: [
      {
        q: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        correct: "Paris",
        category: "Geography",
        difficulty: "easy",
        explanation: "Paris has been the capital of France since the 5th century and is one of the most visited cities in the world."
      },
      {
        q: "Which planet is known as the Red Planet?",
        options: ["Venus", "Mars", "Jupiter", "Saturn"],
        correct: "Mars",
        category: "Science",
        difficulty: "easy",
        explanation: "Mars appears red due to iron oxide (rust) on its surface, giving it a distinctive reddish appearance."
      },
      {
        q: "Who painted the Mona Lisa?",
        options: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"],
        correct: "Leonardo da Vinci",
        category: "Arts",
        difficulty: "easy",
        explanation: "Leonardo da Vinci painted the Mona Lisa between 1503 and 1519, and it's now displayed at the Louvre Museum in Paris."
      },
      {
        q: "What is the largest ocean on Earth?",
        options: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean", "Pacific Ocean"],
        correct: "Pacific Ocean",
        category: "Geography",
        difficulty: "easy",
        explanation: "The Pacific Ocean covers about 165 million square kilometers, making it larger than all of Earth's land area combined."
      },
      {
        q: "How many bones are in the adult human body?",
        options: ["186", "206", "226", "246"],
        correct: "206",
        category: "Science",
        difficulty: "medium",
        explanation: "Adults typically have 206 bones, though babies are born with about 270 bones that fuse together as they grow."
      },
      {
        q: "In which year did World War II end?",
        options: ["1943", "1944", "1945", "1946"],
        correct: "1945",
        category: "History",
        difficulty: "medium",
        explanation: "World War II ended in 1945 with Germany's surrender in May and Japan's surrender in September after the atomic bombings."
      },
      {
        q: "What is the chemical symbol for gold?",
        options: ["Go", "Gd", "Au", "Ag"],
        correct: "Au",
        category: "Science",
        difficulty: "medium",
        explanation: "Gold's symbol 'Au' comes from its Latin name 'aurum,' meaning 'shining dawn' or 'glow of sunrise.'"
      },
      {
        q: "Which Shakespeare play features the characters Romeo and Juliet?",
        options: ["Hamlet", "Macbeth", "Romeo and Juliet", "Othello"],
        correct: "Romeo and Juliet",
        category: "Literature",
        difficulty: "easy",
        explanation: "Romeo and Juliet is Shakespeare's tragic romance about two young star-crossed lovers from feuding families."
      },
      {
        q: "What is the speed of light in a vacuum?",
        options: ["299,792 km/s", "199,792 km/s", "399,792 km/s", "99,792 km/s"],
        correct: "299,792 km/s",
        category: "Science",
        difficulty: "hard",
        explanation: "The speed of light in a vacuum is exactly 299,792,458 meters per second, often rounded to 300,000 km/s."
      },
      {
        q: "Who was the first person to walk on the moon?",
        options: ["Buzz Aldrin", "Neil Armstrong", "Yuri Gagarin", "John Glenn"],
        correct: "Neil Armstrong",
        category: "History",
        difficulty: "easy",
        explanation: "Neil Armstrong became the first human to walk on the moon on July 20, 1969, during the Apollo 11 mission."
      }
    ],
    session_2_questions: [
      {
        q: "What is the smallest country in the world?",
        options: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"],
        correct: "Vatican City",
        category: "Geography",
        difficulty: "medium",
        explanation: "Vatican City covers only 0.44 square kilometers and is located entirely within Rome, Italy."
      },
      {
        q: "Which element has the atomic number 1?",
        options: ["Helium", "Hydrogen", "Oxygen", "Carbon"],
        correct: "Hydrogen",
        category: "Science",
        difficulty: "medium",
        explanation: "Hydrogen is the lightest and most abundant element in the universe, with just one proton in its nucleus."
      },
      {
        q: "In which year was the United States Declaration of Independence signed?",
        options: ["1774", "1775", "1776", "1777"],
        correct: "1776",
        category: "History",
        difficulty: "easy",
        explanation: "The Declaration of Independence was signed on July 4, 1776, marking America's independence from Great Britain."
      },
      {
        q: "What is the largest mammal in the world?",
        options: ["African Elephant", "Blue Whale", "Giraffe", "Polar Bear"],
        correct: "Blue Whale",
        category: "Science",
        difficulty: "easy",
        explanation: "Blue whales can grow up to 30 meters long and weigh up to 200 tons, making them the largest animals ever known."
      },
      {
        q: "Who wrote '1984'?",
        options: ["Aldous Huxley", "George Orwell", "Ray Bradbury", "Franz Kafka"],
        correct: "George Orwell",
        category: "Literature",
        difficulty: "medium",
        explanation: "George Orwell published '1984' in 1949, a dystopian novel about totalitarianism and surveillance."
      },
      {
        q: "What is the hardest natural substance on Earth?",
        options: ["Gold", "Iron", "Diamond", "Titanium"],
        correct: "Diamond",
        category: "Science",
        difficulty: "easy",
        explanation: "Diamond rates 10 on the Mohs hardness scale, formed under extreme pressure deep within the Earth."
      },
      {
        q: "Which continent is the Sahara Desert located on?",
        options: ["Asia", "Australia", "Africa", "South America"],
        correct: "Africa",
        category: "Geography",
        difficulty: "easy",
        explanation: "The Sahara is the largest hot desert in the world, covering most of North Africa with an area of over 9 million square kilometers."
      },
      {
        q: "What year did the Titanic sink?",
        options: ["1910", "1911", "1912", "1913"],
        correct: "1912",
        category: "History",
        difficulty: "medium",
        explanation: "The RMS Titanic sank on April 15, 1912, after hitting an iceberg during its maiden voyage from Southampton to New York."
      },
      {
        q: "How many strings does a standard guitar have?",
        options: ["4", "5", "6", "7"],
        correct: "6",
        category: "Music",
        difficulty: "easy",
        explanation: "A standard guitar has 6 strings, typically tuned to E, A, D, G, B, and E from lowest to highest pitch."
      },
      {
        q: "What is the name of the longest river in the world?",
        options: ["Amazon", "Nile", "Yangtze", "Mississippi"],
        correct: "Nile",
        category: "Geography",
        difficulty: "medium",
        explanation: "The Nile River stretches about 6,650 kilometers through northeastern Africa, though some argue the Amazon is longer."
      }
    ],
    session_3_questions: [
      {
        q: "What is the currency of Japan?",
        options: ["Yuan", "Won", "Yen", "Rupee"],
        correct: "Yen",
        category: "Geography",
        difficulty: "easy",
        explanation: "The Japanese yen (¥) has been Japan's official currency since 1871 and is the third most traded currency worldwide."
      },
      {
        q: "Who developed the theory of relativity?",
        options: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Stephen Hawking"],
        correct: "Albert Einstein",
        category: "Science",
        difficulty: "easy",
        explanation: "Einstein published his special theory of relativity in 1905 and general relativity in 1915, revolutionizing physics."
      },
      {
        q: "What is the main ingredient in guacamole?",
        options: ["Tomato", "Avocado", "Lime", "Pepper"],
        correct: "Avocado",
        category: "Food",
        difficulty: "easy",
        explanation: "Guacamole is a Mexican dip primarily made from mashed avocados, often with lime, salt, onions, and cilantro."
      },
      {
        q: "Which planet is closest to the Sun?",
        options: ["Venus", "Mercury", "Earth", "Mars"],
        correct: "Mercury",
        category: "Science",
        difficulty: "easy",
        explanation: "Mercury orbits at an average distance of 58 million kilometers from the Sun, making it the innermost planet."
      },
      {
        q: "Who was the first woman to win a Nobel Prize?",
        options: ["Marie Curie", "Dorothy Hodgkin", "Rosalind Franklin", "Jane Goodall"],
        correct: "Marie Curie",
        category: "History",
        difficulty: "medium",
        explanation: "Marie Curie won the Nobel Prize in Physics in 1903 and later in Chemistry in 1911, the only person to win in two different sciences."
      },
      {
        q: "What is the square root of 144?",
        options: ["10", "11", "12", "13"],
        correct: "12",
        category: "Mathematics",
        difficulty: "easy",
        explanation: "12 × 12 = 144, making 12 the square root of 144."
      },
      {
        q: "In which city is the famous Colosseum located?",
        options: ["Athens", "Rome", "Cairo", "Istanbul"],
        correct: "Rome",
        category: "Geography",
        difficulty: "easy",
        explanation: "The Colosseum in Rome, Italy, was built around 70-80 AD and could hold up to 80,000 spectators for gladiatorial contests."
      },
      {
        q: "What is the chemical formula for water?",
        options: ["H2O", "CO2", "O2", "H2O2"],
        correct: "H2O",
        category: "Science",
        difficulty: "easy",
        explanation: "Water's chemical formula H2O represents two hydrogen atoms bonded to one oxygen atom."
      },
      {
        q: "Which famous scientist discovered penicillin?",
        options: ["Louis Pasteur", "Alexander Fleming", "Jonas Salk", "Robert Koch"],
        correct: "Alexander Fleming",
        category: "Science",
        difficulty: "medium",
        explanation: "Alexander Fleming discovered penicillin in 1928 by accident, revolutionizing medicine with the first widely used antibiotic."
      },
      {
        q: "How many continents are there on Earth?",
        options: ["5", "6", "7", "8"],
        correct: "7",
        category: "Geography",
        difficulty: "easy",
        explanation: "Earth has seven continents: Africa, Antarctica, Asia, Europe, North America, Oceania, and South America."
      }
    ]
  },
  breakVideos: [
    {
      id: 'demo-break-1',
      break_position: 1,
      title: 'Deep Breathing Exercise',
      tip_content: '🌬️ Try box breathing: Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 3 times. This simple technique can reduce stress and improve focus.',
      duration_seconds: 30,
      video_url: 'demo'
    },
    {
      id: 'demo-break-2',
      break_position: 2,
      title: 'Mindful Pause & Stretch',
      tip_content: '🧘 Take a moment to stretch your neck and shoulders. Roll your shoulders back 5 times, then tilt your head gently side to side. Movement helps mental clarity and reduces tension.',
      duration_seconds: 45,
      video_url: 'demo'
    }
  ]
};
