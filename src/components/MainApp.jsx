import { CircleX, Download, Import, Paintbrush, PaintBucket, PaintRoller } from 'lucide-react';
import { useEffect, useRef, useState } from 'react'

import DealTicket from "./DealTicket.jsx";

import style from './MainApp.module.scss'
import { useAccount, useReadContract, useSignMessage, useSignTypedData, WagmiProvider } from 'wagmi';
import { keccak256, toHex } from 'viem';
import { readContracts } from 'wagmi/actions';
import domToImage from 'dom-to-image-more';
import config from '../config.js';

import Arrow from "../assets/arrow.svg"
import Big from 'big.js';

Big.DP = 18;
Big.RM = Big.roundDown;

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
	{
		inputs: [],
		stateMutability: "view",
		type: "function",
		name: "name",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string",
			},
		],
	},
	{
		inputs: [
			{
				internalType: "address",
				name: "owner",
				type: "address",
			},
		],
		stateMutability: "view",
		type: "function",
		name: "nonces",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256",
			},
		],
	},
	{
		inputs: [],
		name: "version",
		outputs: [{ internalType: "string", name: "", type: "string" }],
		stateMutability: "view",
		type: "function",
	},
];

function MainApp() {
	const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
	const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000123";
	const BASE_CHAIN_ID = 8453;

	const [isBuy, setIsBuy] = useState(true);
	const [token, setToken] = useState('');
	const [tokenName, setTokenName] = useState('Null Token');
	const [tokenSymbol, setTokenSymbol] = useState('NULL');
	const [secondParty, setSecondParty] = useState('0x0000000000000000000000000000000000000000');
	const [price, setPrice] = useState('0.00');
	const [amount, setAmount] = useState('0');
	const [locked, setLocked] = useState(false);

	const [buyerSignature, setBuyerSignature] = useState('');
	const [sellerSignature, setSellerSignature] = useState('');
	const [buyerPermitSignature, setBuyerPermitSignature] = useState('');
	const [sellerPermitSignature, setSellerPermitSignature] = useState('');
	
	const account = useAccount();
	const { signMessage } = useSignMessage();
	const { signTypedData } = useSignTypedData();
	const refToCapture = useRef(null);

	const [moveHint, setMoveHint] = useState(false);
	const [themeNonce, setThemeNonce] = useState(Math.floor(Math.random() * 500));

	// TODO: Make this to not use generic variable names
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

	function createDealMessage() {
		const buyer = isBuy ? account.address : secondParty;
		const seller = !isBuy ? account.address : secondParty;
		const initiatedAt = Math.floor(Date.now() / 1000);
		const deadline = initiatedAt + 86400; // 24 hours later
		const message =
			`Buyer: ${buyer}\n` +
			`Seller: ${seller}\n` +
			`For token: ${token}\n` +
			`Price: ${price}\n` +
			`For ${amount} amount of tokens\n` +
			`Initiated at: ${initiatedAt}\n` +
			`With deadline at: ${deadline}`;
		const fullMessage = message;
		return fullMessage;
	}

	function appendPrefix(message) {
		const prefix = `Ethereum Signed Message:\n${message.length}`;
		return prefix + message;
	}

	function hashDeal() {
		const fullMessage = appendPrefix(createDealMessage());
		const hashBuffer = keccak256(toHex(fullMessage));
		return hashBuffer;
	}

	async function signUSDCPermit() {
		const contract = {
			address: USDC_ADDRESS,
			abi: ERC20_ABI,
		};
		const readResults = await readContracts(config, {
			contracts: [
				{
					...contract,
					functionName: 'name',
				},
				{
					...contract,
					functionName: 'nonces',
					args: [account.address]
				},
				{
					...contract,
					functionName: 'version',
				},
			]
		});
		const [nameResult, nonceResult, versionResult] = readResults;
		const nonce = nonceResult.result;
		const version = versionResult.result;

		console.log(readResults);

		const name = nameResult.result;
		const spender = ROUTER_ADDRESS;
		const value = Big(price).mul(amount).div(Big('1e18'));
		const deadline = BigInt(Big(Date.now()).div('1000').toFixed(0)) + BigInt('86400'); // 24 hours later

		const domain = {
			name: name,
			version: version,
			chainId: BASE_CHAIN_ID,
			verifyingContract: USDC_ADDRESS,
		};

		const types = {
			Permit: [
				{ name: 'owner', type: 'address' },
				{ name: 'spender', type: 'address' },
				{ name: 'value', type: 'uint256' },
				{ name: 'nonce', type: 'uint256' },
				{ name: 'deadline', type: 'uint256' },
			],
		};

		const message = {
			owner: account.address,
			spender: spender,
			value: value,
			nonce: Big(nonce).toString(),
			deadline: deadline.toString()
		};
		signTypedData({
			domain: domain,
			types: types,
			message: message,
			primaryType: 'Permit'
		}, {
			onSuccess(data) {
				if (isBuy) setBuyerPermitSignature(data);
				else setSellerPermitSignature(data);
			},
			onError(error) {
				console.error('Error signing USDC permit:', error);
			}
		});
	}

	function handleFormSubmit(event) {
		event.preventDefault();
		if (locked) {
			alert("Deal locked. You can cancel the deal by using the Reject Deal button.");
			return;
		}
		if (!token || !secondParty || !price || !amount || price == 0 || amount == 0) {
			alert('Please fill in all fields.');
			return;
		}

		const dealMsg = createDealMessage();
		signMessage({
			message: dealMsg
		}, {
			onSuccess(data) {
				setLocked(true);
				if (isBuy) setBuyerSignature(data);
				else setSellerSignature(data);

				signUSDCPermit();
			}
		});
	}

	function downloadDealTicket() {
		if (refToCapture.current) {
			const scale = 8;
			const options = {
				width: refToCapture.current.offsetWidth * scale,
				height: refToCapture.current.offsetHeight * scale,
				style: {
					transform: `scale(${scale})`,
					transformOrigin: 'top left',
					overflow: 'hidden',
				}
			};
			// TODO: Tidy this hackish shit
			domToImage.toBlob(refToCapture.current, options)
				.then(blob => {
					const link = document.createElement('a');
					link.href = URL.createObjectURL(blob);
					const now = new Date();
					const pad = n => n.toString().padStart(2, '0');
					const formattedDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
					link.download = `deal_ticket_${formattedDate}.png`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);
				})
				.catch(error => {
					console.error('Error downloading deal ticket:', error);
				});
		}
	}

	return (
		<div className={style.container}>
			<div className={style.leftSide}>
				<form onSubmit={handleFormSubmit}>
					<div className={style.tab}>
						<button
							type="button"
							className={isBuy ? style.active : ''}
							onClick={() => !locked ? setIsBuy(true) : null}
						>
							Buy
						</button>
						<button
							type="button"
							className={!isBuy ? style.active : ''}
							onClick={() => !locked ? setIsBuy(false) : null}
						>
							Sell
						</button>
					</div>
					<div className={style.innerForm}>
						<div>
							<label htmlFor="token">Token</label>
							<input
								id="token"
								onChange={e => setToken(e.target.value)}
								placeholder='0x0000000000000000000000000000000000000000'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="2ndparty">Trading with</label>
							<input
								id="2ndparty"
								onChange={e => setSecondParty(e.target.value)}
								placeholder='0x0000000000000000000000000000000000000000'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="price">Price set</label>
							<input
								id="price"
								onChange={e => setPrice((BigInt(Big(e.target.value).mul(Big(1e6)))))}
								placeholder='0.00'
								disabled={locked}
							/>
						</div>
						<div>
							<label htmlFor="amount">Amount</label>
							<input
								id="amount"
								onChange={e => setAmount((BigInt(e.target.value) * (BigInt(1e18))))}
								placeholder='1000'
								disabled={locked}
							/>
						</div>
					</div>
					<button type="submit" className={style.submitButton + ' ' + (isBuy ? style.buttonBuy : style.buttonSell)}>
						{
							locked ?
								"DEAL LOCKED"
								:
								"Sign the deal"
						}
					</button>
				</form>
			</div>
			<div className={style.dealTicket}>
				<DealTicket ref={refToCapture}
					isBuy={isBuy}
					tokenName={tokenName}
					token={token}
					tokenSymbol={tokenSymbol}
					secondParty={secondParty}
					price={price}
					amount={amount}
					buyerSignature={buyerSignature}
					sellerSignature={sellerSignature}
					buyerPermitSignature={buyerPermitSignature}
					sellerPermitSignature={sellerPermitSignature}
					themeNonce={themeNonce}
					account={account}
				/>
				<div className={style.dealTicketFooter}>
					<div onClick={downloadDealTicket}>
						<Download strokeWidth={'1.5px'} size={18} /> Download
					</div>
					<div>
						<Import strokeWidth={'1.5px'} size={18} /> Import Deal
					</div>
					<div>
						<CircleX strokeWidth={'1.5px'} size={18} /> Reject Deal
					</div>
					<div className={style.randomTheme} onMouseOver={() => setMoveHint(true)} onMouseLeave={() => setMoveHint(false)} onClick={() => setThemeNonce(Math.floor(Math.random() * 500))}>
						<Paintbrush strokeWidth={'1.5px'} size={18} />
					</div>
					<div className={style.randomThemeHint + ' ' + (moveHint ? style.randomThemeHintMove : '')}>
						<img src={Arrow} />
						{/* <span>{";)"}</span> */}
					</div>
				</div>
			</div>
		</div>
	);
}

export default MainApp;