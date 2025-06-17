import React from 'react'
import './Footer.scss'
import github from '../../assets/images/github.png'
import linkedin from '../../assets/images/linkedin.png'

function Footer() {
	return (
		<div className="footer">
			<div className="resume">
				<a
					href="https://drive.google.com/file/d/1mKznZjjDMGoMfT0MCBa3R89Hz2LKNCsi/view?usp=sharing"
					target="_blank"
					rel="noreferrer"
					className="footer-link"
				>
					<h1>Resume</h1>
				</a>
			</div>
			<div className="item">
				<h1>Made with ❤️ by kauC</h1>
			</div>
			<div className="socials">
				<a href="https://github.com/shivansh9848" target="_blank" rel="noreferrer">
					<img src={github} className="github" alt="" />
				</a>
				<a
					href="https://www.linkedin.com/in/shivansh-rai-287750224/"
					target="_blank"
					rel="noreferrer"
				>
					<img src={linkedin} className="linkedin" alt="" />
				</a>
			</div>
		</div>
	)
}

export default Footer
