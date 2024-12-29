# Build Stage
FROM node:20-alpine AS build
RUN apk --no-cache add curl

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Download HandRanks.dat
RUN curl -LJO https://github.com/christophschmalhofer/poker/raw/master/XPokerEval/XPokerEval.TwoPlusTwo/HandRanks.dat
RUN mv -f HandRanks.dat ./src/


RUN npm run build

# Copy assets
RUN mkdir -p ./dist/assets && cp ./src/assets/names.txt ./dist/assets/
RUN cp ./src/HandRanks.dat ./dist/HandRanks.dat

# Clean Image Stage
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only the necessary files from the build stage
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/src/assets/names.txt ./dist/assets/names.txt
COPY --from=build /usr/src/app/package*.json ./

RUN npm install --production

EXPOSE 8000

CMD [ "node", "dist/index.js" ]
