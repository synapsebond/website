import { useState } from 'react'

import ConnectButton from './ConnectButton.jsx'

import styles from "./NavBar.module.scss"

function NavBar() {
	return (
		<nav className={styles.nav}>
			<span className={styles.brand}>Synapse</span>
			<ConnectButton />
		</nav>
	);
}

export default NavBar;