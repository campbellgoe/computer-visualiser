import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  html,
  body {
    color: ${({ theme }) => theme.colors.primary};
    padding: 0;
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen,
      Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  * {
    box-sizing: border-box;
  }

  h1, h2, h3 {
    display: inline-block;
    vertical-align: sub;
    margin-right: 1.5ch;
  }

  pre {
    white-space: pre-wrap;
  }
  .author {
    position: fixed;
    bottom: 10px;
    right: 20px;
    background: black;
    color: white;
    a {
      color: #7da0e7;
      font-weight: bold;
    }
  }
`

export default GlobalStyle
