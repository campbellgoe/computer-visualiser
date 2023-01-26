import React from 'react'
import ThreeApp from '../components/Three/ThreeApp'

const IndexPage = () => {
  const website = 'https://georgecampbell.co.uk'
  return (<>
  <ThreeApp/>
  <div className="author">Author: George O. E. Campbell © 2023 <a href={website}>{website}</a></div>
  </>)
}

export default IndexPage
