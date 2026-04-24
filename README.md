# JS Code Visualizer

A modern, interactive tool to visualize JavaScript code execution, syntax trees, and logical flow. Built with **Next.js**, **Monaco Editor**, and **Framer Motion**.

## 🚀 Features

- **Interactive Code Editor**: Powered by Monaco Editor for a VS Code-like experience.
- **Real-time Visualization**: Visualize your JavaScript code logic as you type.
- **Modern UI**: Sleek design using Tailwind CSS 4 and Lucide icons.
- **Fluid Animations**: Smooth transitions and visual feedback with Framer Motion.
- **State Management**: Robust state handling with Zustand.

## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Editor**: [@monaco-editor/react](https://www.npmjs.com/package/@monaco-editor/react)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Parsing**: [Babel Parser](https://babeljs.io/docs/en/babel-parser)

## 🏁 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Mahamadkadiwal/js-code-visual.git
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📖 How it Works

The tool uses the Babel parser to generate an Abstract Syntax Tree (AST) from your JavaScript code. This tree is then mapped to visual components that animate and change state based on the code's structure and logic.

## 📄 License

This project is licensed under the ISC License.
