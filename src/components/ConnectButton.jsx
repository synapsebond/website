import { useAccountModal, useChainModal, useConnectModal } from '@rainbow-me/rainbowkit';
import { useState } from 'react'

import style from './ConnectButton.module.scss'
import { useAccount, useAccountEffect, useDisconnect } from 'wagmi';

function ConnectButton() {
	const { openConnectModal } = useConnectModal();
	const { openAccountModal } = useAccountModal();
	const { openChainModal } = useChainModal();
	const { isConnected } = useAccount();
	const { disconnect } = useDisconnect();

	function handleClick() {
		if (!isConnected) openConnectModal();
		else disconnect();
	}

	const [text, setText] = useState('Connect');

	useAccountEffect({
		onConnect(data) {
			setText(data.address);
		},
		onDisconnect() {
			setText('Connect');
		}
	});

	return (
		<div onClick={handleClick} className={style.button}>
			{text}
		</div>
	);
}

export default ConnectButton;