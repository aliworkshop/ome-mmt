.PHONY: install dev build preview clean

install:
	npm install

dev: install
	npm run dev

build: install
	npm run build

preview: build
	npm run preview

clean:
	rm -rf dist node_modules