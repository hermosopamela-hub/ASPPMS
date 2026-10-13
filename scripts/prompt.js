// Tiny question-and-answer helper for the setup scripts. No dependencies.
// In a terminal it asks live (and hides passwords as they are typed); when input is piped in,
// it reads one line per question, which keeps the scripts testable.
const readline = require('readline');

function createPrompter() {
  const interactive = process.stdin.isTTY;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!interactive });

  const queue = [];
  let waiting = null;
  let closed = false;
  if (!interactive) {
    rl.on('line', (line) => (waiting ? waiting(line) : queue.push(line)));
    rl.on('close', () => {
      closed = true;
      if (waiting) waiting(null);
    });
  }
  // Piped input that runs out is an error, not an empty answer: otherwise a "keep asking until valid"
  // loop would spin forever.
  const nextLine = () =>
    new Promise((resolve, reject) => {
      const ended = () => reject(new Error('The input ended before every question was answered.'));
      if (queue.length) return resolve(queue.shift());
      if (closed) return ended();
      waiting = (line) => {
        waiting = null;
        if (line === null) ended();
        else resolve(line);
      };
    });

  function ask(question, { hidden = false } = {}) {
    if (!interactive) {
      process.stdout.write(question);
      return nextLine().then((answer) => {
        process.stdout.write('\n');
        return answer;
      });
    }
    return new Promise((resolve) => {
      if (hidden) {
        // swallow what is typed, but still show the question
        const write = rl._writeToOutput;
        rl._writeToOutput = (text) => {
          if (text.includes(question)) write.call(rl, text);
        };
        rl.question(question, (answer) => {
          rl._writeToOutput = write;
          process.stdout.write('\n');
          resolve(answer);
        });
      } else {
        rl.question(question, resolve);
      }
    });
  }

  return { ask, close: () => rl.close() };
}

module.exports = { createPrompter };
