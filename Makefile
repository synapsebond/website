build:
	npm run build
	cd dist && 7z a ../dist.zip ./* && cd ..
