BIN := node_modules/.bin
TYPESCRIPT := $(shell jq -r '.files[]' tsconfig.json | grep -v node_modules)
JAVASCRIPT := $(TYPESCRIPT:%.ts=%.js)
MOCHA_ARGS := --compilers js:babel-core/register --timeout 10000

all: $(JAVASCRIPT) $(TYPESCRIPT:%.ts=%.d.ts) .npmignore .gitignore

$(BIN)/tsc $(BIN)/mocha $(BIN)/_mocha $(BIN)/istanbul:
	npm install

%.js: %.ts $(BIN)/tsc
	$(BIN)/tsc

%.js %.d.ts: %.ts $(BIN)/tsc
	$(BIN)/tsc -d

clean:
	rm -f $(JAVASCRIPT) $(TYPESCRIPT:%.ts=%.d.ts)

test: $(JAVASCRIPT) $(BIN)/mocha
	$(BIN)/mocha $(MOCHA_ARGS) tests/

.npmignore: tsconfig.json
	echo $(TYPESCRIPT) Makefile tsconfig.json | tr ' ' '\n' > $@

.gitignore: tsconfig.json
	echo $(TYPESCRIPT:%.ts=/%.js) $(TYPESCRIPT:%.ts=/%.d.ts) | tr ' ' '\n' > $@

coverage: $(JAVASCRIPT) $(BIN)/istanbul $(BIN)/_mocha
	$(BIN)/istanbul cover $(BIN)/_mocha -- $(MOCHA_ARGS) -R spec tests/
