import { Download } from 'lucide-react';
import { useEffect, useState } from 'react'

import DealTicket from "./DealTicket.jsx";

import style from './MainApp.module.scss'
import { useReadContract } from 'wagmi';
import { getToken } from 'wagmi/actions';
import config from '../config.js';
import { readContract } from 'viem/actions';

const ERC20_ABI = [
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "symbol",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
];

function MainApp() {
	const [isBuy, setIsBuy] = useState(true);
	const [token, setToken] = useState('');
	const [tokenName, setTokenName] = useState('Null Token');
	const [tokenSymbol, setTokenSymbol] = useState('NULL');
	const [secondParty, setSecondParty] = useState('0x0000000000000000000000000000000000000000');
	const [price, setPrice] = useState('0.00');
	const [amount, setAmount] = useState('0');

	const { data, error } = useReadContract({
		abi: ERC20_ABI,
		address: token,
		functionName: 'name',
		enabled: !!token,
	});

	useEffect(() => {
		if (data) setTokenName(data);
		if (error) console.error('Error fetching token name:', error);
	}, [data, error]);

	const { data: symbolData, error: symbolError } = useReadContract({
		abi: ERC20_ABI,
		address: token,
		functionName: 'symbol',
		enabled: !!token,
	});

	useEffect(() => {
		if (symbolData) setTokenSymbol(symbolData);
		if (symbolError) console.error('Error fetching token symbol:', symbolError);
	}, [symbolData, symbolError]);

	return (
		<div className={style.container}>
			<div className={style.leftSide}>
				<form>
					<div className={style.tab}>
						<button
							type="button"
							className={isBuy ? style.active : ''}
							onClick={() => setIsBuy(true)}
						>
							Buy
						</button>
						<button
							type="button"
							className={!isBuy ? style.active : ''}
							onClick={() => setIsBuy(false)}
						>
							Sell
						</button>
					</div>
					<div className={style.innerForm}>
						<div>
							<label htmlFor="token">Token</label>
							<input
								id="token"
								value={token}
								onChange={e => setToken(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="2ndparty">Trading with</label>
							<input
								id="2ndparty"
								value={secondParty}
								onChange={e => setSecondParty(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="price">Price set</label>
							<input
								id="price"
								value={price}
								onChange={e => setPrice(e.target.value)}
							/>
						</div>
						<div>
							<label htmlFor="amount">Amount</label>
							<input
								id="amount"
								value={amount}
								onChange={e => setAmount(e.target.value)}
							/>
						</div>
					</div>
				</form>
			</div>
			<div className={style.dealTicket}>
				<DealTicket
					isBuy={isBuy}
					tokenName={tokenName}
					token={token}
					tokenSymbol={tokenSymbol}
					secondParty={secondParty}
					price={price}
					amount={amount}
				/>
				<div className={style.dealTicketFooter}>
					<div>
						<Download strokeWidth={'1.5px'} size={18} /> Download
					</div>
				</div>
			</div>
		</div>
	);
}

export default MainApp;