class Game {
	constructor() {
		this.field = [];
		this.width = 40;
		this.height = 24;
		this.fieldElement = document.querySelector(".field");
		this.smartCorridorsCheck = document.querySelector("#gen-cor");
		this.rooms = [];
		// Настройки генерации комнат. В дальнейшем можно перенести настройку на страницу.
		this.minWidth = 3;
		this.maxWidth = 9;
		this.minHeight = 3;
		this.maxHeight = 8;
		// Кол-во врагов
		this.enemies = 10;
		// Кол-во предметов
		this.healingPotionsCount = 10;
		this.swordsCount = 2;
		// Экземпляры других классов
		this.player = new Player();
		this.playerInfo = {
			y: 0,
			x: 0,
			hp: this.player.maxHp,
			maxHp: this.player.maxHp,
			haveSword: false,
		};
		this.enemiesArray = [];
		this.creature = new Creature();
		this.item = new Item();
	}
	init() {
		this.clearField();
		this.generateLevel();
	}
	applyEventListener() {
		addEventListener("keydown", (e) => {
			const input = e.code;
			const inputsVariants = {
				KeyA: "left",
				KeyD: "right",
				KeyW: "up",
				KeyS: "down",
				Space: "attack",
				ArrowLeft: "left",
				ArrowRight: "right",
				ArrowUp: "up",
				ArrowDown: "down",
			};
			if (input in inputsVariants) {
				e.preventDefault();
				this.handlePlayerInput(inputsVariants[input]);
			}
		});
	}

	// Метод генерации уровня
	generateLevel() {
		this.lvl = new Level(
			this.width,
			this.height,
			this.field,
			this.rooms,
			this.fieldElement
		);
		if (!this.smartCorridorsCheck.checked) {
			this.lvl.generateDummyWays();
		}

		// Создание нескольких комнат
		const numRooms = Math.floor(Math.random() * 6) + 5;
		while (this.rooms.length < numRooms) {
			this.lvl.createRoom(
				this.rooms,
				this.minWidth,
				this.maxWidth,
				this.minHeight,
				this.maxHeight,
				this.smartCorridorsCheck.checked
			);
		}
		if (this.smartCorridorsCheck.checked) {
			this.lvl.generatePassagesBetweenRooms();
		}

		// Генерация стартовой позиции игрока
		const newPlayer = this.player.generatePlacement(this.rooms, this.field);
		let index = newPlayer.roomIndex;
		this.field[newPlayer.placement.y][newPlayer.placement.x] = "player";
		this.playerInfo.x = newPlayer.placement.x;
		this.playerInfo.y = newPlayer.placement.y;
		this.playerInfo.hp = this.player.maxHp;
		this.playerInfo.haveSword = false;

		// Генерация врагов
		const creature = new Creature();
		for (let i = 0; i < this.enemies; i++) {
			let place = creature.generatePlacement(
				this.rooms,
				this.field,
				index
			);
			this.field[place.placement.y][place.placement.x] = "enemy";
			this.enemiesArray.push({
				y: place.placement.y,
				x: place.placement.x,
				hp: creature.maxHp,
				maxHp: creature.maxHp,
			});
		}
		// Генерация предметов
		for (let i = 0; i < this.healingPotionsCount; i++) {
			this.item.generateItemPlacement(this.field, "hp");
		}
		for (let i = 0; i < this.swordsCount; i++) {
			this.item.generateItemPlacement(this.field, "sword");
		}
		this.lvl.fillField();
	}
	clearField() {
		console.clear();
		this.fieldElement.innerHTML = "";
		// Заполнение поля исходными значениями
		this.field = Array.from({ length: this.height }, () =>
			Array(this.width).fill("wall")
		);
		this.rooms = [];
		this.enemiesArray = [];
	}

	handlePlayerInput(action) {
		if (this.enemiesArray.length === 0) {
			document.querySelector("#clear").click();
			document.querySelector(".field").innerHTML =
				"<h1>ВЫ ВЫИГРАЛИ!</h1>";
			return;
		}
		if (action === "attack") {
			this.player.attackEnemies(
				this.enemiesArray,
				this.playerInfo,
				this.field
			);
		} else {
			let { y, x } = this.playerInfo;
			this.player.movePlayer(action, this.playerInfo, this.field);
			if (y == this.playerInfo.y && x == this.playerInfo.x) {
				return;
			}
		}
		this.creature.moveEnemiesTowardsPlayer(
			this.playerInfo,
			this.field,
			this.enemiesArray
		);
		this.lvl.updateField(this.playerInfo, this.enemiesArray);
	}
}

class Level {
	constructor(width, height, field, rooms, fieldElement) {
		this.width = width;
		this.height = height;
		this.field = field;
		this.rooms = rooms;
		this.fieldElement = fieldElement;
		this.tileClasses = {
			floor: "tile",
			enemy: "tile tileE",
			player: "tile tileP",
			hp: "tile tileHP",
			sword: "tile tileSW",
		};
	}

	createRoom(rooms, minWidth, maxWidth, minHeight, maxHeight, isChecked) {
		let x, y;
		const roomWidth =
			Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
		const roomHeight =
			Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;

		if (isChecked) {
			x = Math.floor(Math.random() * (this.width - roomWidth - 1)) + 1;
			y = Math.floor(Math.random() * (this.height - roomHeight - 1)) + 1;
		} else {
			const floors = findFloorIndices(this.field);
			const index = Math.floor(Math.random() * floors.length);
			x = floors[index].x;
			y = floors[index].y;
		}

		// Проверка на пересечение с другими комнатами
		for (let i = 0; i < rooms.length; i++) {
			const room = rooms[i];
			if (
				x < room.x + room.roomWidth &&
				x + roomWidth > room.x &&
				y < room.y + room.roomHeight &&
				y + roomHeight > room.y
			) {
				return false;
			}
		}
		// Проверка на выход за границы поля
		if (
			x < 0 ||
			x + roomWidth >= this.width ||
			y < 0 ||
			y + roomHeight >= this.height
		) {
			return false;
		}

		// Создание комнаты
		for (let i = y; i < y + roomHeight; i++) {
			for (let j = x; j < x + roomWidth; j++) {
				if (i < this.height && j < this.width) {
					this.field[i][j] = "floor";
				}
			}
		}

		rooms.push({ x, y, roomWidth, roomHeight });
		return true;
	}
	generateDummyWays() {
		const linesCount = Math.floor(Math.random() * 3) + 3;
		let horizontalLines = [];
		let verticalLines = [];
		horizontalLines.push(this.createHorizontal(horizontalLines));
		verticalLines.push(this.createVertical(verticalLines));
		for (let i = 0; i < linesCount-2; i++) {
			const isVertical = Math.random() < 0.5;

			if (isVertical) {
				verticalLines.push(this.createVertical(verticalLines));
			} else {
				horizontalLines.push(this.createHorizontal(horizontalLines));
			}
		}
	}

	createVertical(LineEnds) {
		let lineX = Math.floor(Math.random() * (this.width - 2)) + 1;
		// Проверка расстояния до остальных дорожек
		while (
			LineEnds.includes(lineX) ||
			LineEnds.includes(lineX + 1) ||
			LineEnds.includes(lineX - 1)
		) {
			lineX = Math.floor(Math.random() * (this.width - 2)) + 1;
		}

		for (let y = 0; y < this.height; y++) {
			this.field[y][lineX] = "floor";
		}

		return lineX;
	}

	createHorizontal(LineEnds) {
		let lineY = Math.floor(Math.random() * (this.height - 2)) + 1;

		// Проверка расстояния до остальных дорожек
		while (
			LineEnds.includes(lineY) ||
			LineEnds.includes(lineY + 1) ||
			LineEnds.includes(lineY - 1)
		) {
			lineY = Math.floor(Math.random() * (this.height - 2)) + 1;
		}

		for (let x = 0; x < this.width; x++) {
			this.field[lineY][x] = "floor";
		}

		return lineY;
	}

	generatePassagesBetweenRooms() {
		for (let i = 0; i < this.rooms.length; i++) {
			for (let j = i + 1; j < this.rooms.length; j++) {
				this.createPassageBetweenRooms(this.rooms[i], this.rooms[j]);
			}
		}
	}

	/*
	 * Метод для прокладывания "дорожек" между комнатами
	 * Для себя можно в дальнейшем попробовать использовать BSP-деревья.
	 */
	createPassageBetweenRooms(roomA, roomB) {
		const startX = Math.floor(roomA.x + roomA.roomWidth / 2);
		const startY = Math.floor(roomA.y + roomA.roomHeight / 2);
		const endX = Math.floor(roomB.x + roomB.roomWidth / 2);
		const endY = Math.floor(roomB.y + roomB.roomHeight / 2);

		let currentX = startX;
		let currentY = startY;

		while (currentX !== endX) {
			if (currentX < endX) {
				currentX++;
			} else if (currentX > endX) {
				currentX--;
			}

			this.field[currentY][currentX] = "floor";
		}

		while (currentY !== endY) {
			if (currentY < endY) {
				currentY++;
			} else if (currentY > endY) {
				currentY--;
			}

			this.field[currentY][currentX] = "floor";
		}
	}
	// Метод для отрисовки карты на игровом поле
	fillField() {
		for (let i = 0; i < this.height; i++) {
			// Создание колонок для более удобного расположения клеток
			let cont = document.createElement("div");
			cont.className = "column-container";
			cont.id = "column-" + i;
			this.fieldElement.appendChild(cont);
			cont = document.querySelector("#column-" + i);

			for (let j = 0; j < this.width; j++) {
				let elem = document.createElement("div");
				const defaultClass = "tile tileW";

				elem.className =
					this.tileClasses[this.field[i][j]] || defaultClass;
				if (elem.className === "tile tileP") {
					let hpCont = document.createElement("div");
					hpCont.className = "health";
					hpCont.style = `width: 100%`;
					elem.appendChild(hpCont);
				} else if (elem.className === "tile tileE") {
					let hpCont = document.createElement("div");
					hpCont.className = "health";
					hpCont.style = `width: 100%`;
					elem.appendChild(hpCont);
				}
				elem.id = `[${j}], [${i}]`;
				cont.appendChild(elem);
			}
		}
	}
	updateField(playerInfo, enemiesArray) {
		for (let i = 0; i < this.height; i++) {
			for (let j = 0; j < this.width; j++) {
				const tileId = `[${j}], [${i}]`;
				const elem = document.getElementById(tileId);
				const defaultClass = "tile tileW";

				if (elem) {
					const updatedClass =
						this.tileClasses[this.field[i][j]] || defaultClass;
					elem.className = updatedClass;
					elem.innerHTML = "";
					if (elem.className === "tile tileP") {
						const hpCont = document.createElement("div");
						const hpPercentage =
							(playerInfo.hp / playerInfo.maxHp) * 100;

						hpCont.className = "health";
						hpCont.style = `height: 3px; width: ${hpPercentage}%`;
						elem.appendChild(hpCont);
					} else if (elem.className === "tile tileE") {
						const enemyIndex = enemiesArray.findIndex(
							(enemy) => enemy.x === j && enemy.y === i
						);
						const hpCont = document.createElement("div");
						const hpPercentage =
							(enemiesArray[enemyIndex].hp /
								enemiesArray[enemyIndex].maxHp) *
							100;

						hpCont.className = "health";
						hpCont.style = `height: 3px; width: ${hpPercentage}%`;
						elem.appendChild(hpCont);
					}
				}
			}
		}
	}
}

class Creature {
	constructor() {
		this.maxHp = 10;
		this.placement;
		this.dmg = 5;
	}
	generatePlacement(rooms, field, startRoom = 0) {
		if (rooms.length === 0) {
			return;
		}
		let index = Math.floor(Math.random() * rooms.length);
		let startingRoom = rooms[index];
		if (startingRoom == rooms[startRoom]) {
			return this.generatePlacement(rooms, field, startRoom);
		}
		this.placement = {
			x:
				startingRoom.x +
				Math.floor(Math.random() * startingRoom.roomWidth),
			y:
				startingRoom.y +
				Math.floor(Math.random() * startingRoom.roomHeight),
		};
		if (field[this.placement.y][this.placement.x] === "floor") {
			return { placement: this.placement, roomIndex: index };
		} else {
			return this.generatePlacement(rooms, field, startRoom);
		}
	}
	moveEnemiesTowardsPlayer(playerInfo, field, enemiesArray) {
		const playerX = playerInfo.x;
		const playerY = playerInfo.y;

		const isValidMove = (x, y) =>
			x >= 0 &&
			x < field[0].length &&
			y >= 0 &&
			y < field.length &&
			field[y][x] === "floor";

		enemiesArray.forEach((enemy) => {
			const enemyX = enemy.x;
			const enemyY = enemy.y;

			const dx = playerX - enemyX;
			const dy = playerY - enemyY;

			const possibleMoves = [];

			if (Math.abs(dx) > Math.abs(dy)) {
				possibleMoves.push({ x: enemyX + Math.sign(dx), y: enemyY });
				possibleMoves.push({ x: enemyX, y: enemyY + Math.sign(dy) });
			} else {
				possibleMoves.push({ x: enemyX, y: enemyY + Math.sign(dy) });
				possibleMoves.push({ x: enemyX + Math.sign(dx), y: enemyY });
			}

			let moved = false;

			for (const move of possibleMoves) {
				if (isValidMove(move.x, move.y)) {
					field[enemyY][enemyX] = "floor";
					field[move.y][move.x] = "enemy";
					enemy.x = move.x;
					enemy.y = move.y;
					moved = true;
					break;
				} else if (field[move.y][move.x] === "player") {
					playerInfo.hp -= this.dmg;
					if (playerInfo.hp <= 0) {
						document.querySelector("#clear").click();
						document.querySelector(".field").innerHTML =
							"<h1>ИГРА ОКОНЧЕНА</h1>";
						return;
					}
					break;
				}
			}

			if (!moved) {
				field[enemyY][enemyX] = "enemy";
			}
		});
	}
}

class Player extends Creature {
	constructor() {
		super();
		this.maxHp = 20;
		this.inventory = [];
	}
	movePlayer(dir, playerInfo, field) {
		const { x, y } = playerInfo;
		switch (dir) {
			case "left":
				playerInfo.x--;
				break;
			case "right":
				playerInfo.x++;
				break;
			case "up":
				playerInfo.y--;
				break;
			case "down":
				playerInfo.y++;
				break;
			default:
				return;
		}

		if (
			field[playerInfo.y][playerInfo.x] !== "wall" &&
			field[playerInfo.y][playerInfo.x] !== "enemy"
		) {
			if (field[playerInfo.y][playerInfo.x] === "hp") {
				playerInfo.hp += 5;
				playerInfo.hp = Math.min(playerInfo.hp, playerInfo.maxHp);
			} else if (field[playerInfo.y][playerInfo.x] === "sword") {
				playerInfo.haveSword = true;
			}
			field[y][x] = "floor"; // Стираем старую позицию игрока
			field[playerInfo.y][playerInfo.x] = "player"; // Устанавливаем новую позицию игрока в поле // Обновляем местоположение игрока в Game
		} else {
			(playerInfo.x = x), (playerInfo.y = y);
		}
	}
	attackEnemies(enemiesArray, playerInfo, field) {
		const { x: playerX, y: playerY } = playerInfo;

		const surroundingCells = [
			{ x: playerX - 1, y: playerY - 1 },
			{ x: playerX, y: playerY - 1 },
			{ x: playerX + 1, y: playerY - 1 },
			{ x: playerX - 1, y: playerY },
			{ x: playerX + 1, y: playerY },
			{ x: playerX - 1, y: playerY + 1 },
			{ x: playerX, y: playerY + 1 },
			{ x: playerX + 1, y: playerY + 1 },
		];

		for (const cell of surroundingCells) {
			const index = enemiesArray.findIndex(
				(enemy) => enemy.x === cell.x && enemy.y === cell.y
			);

			if (index !== -1) {
				const enemy = enemiesArray[index];
				if (playerInfo.haveSword) {
					enemy.hp -= this.dmg * 2;
				} else {
					enemy.hp -= this.dmg;
				}
				if (enemy.hp <= 0) {
					field[enemy.y][enemy.x] = "floor";
					enemiesArray.splice(index, 1);
				}
			}
		}
		playerInfo.haveSword = false;
	}
}

class Item {
	constructor() {}
	generateItemPlacement(field, name) {
		const floors = findFloorIndices(field);
		let index = Math.floor(Math.random() * floors.length);
		const chosenOne = floors[index];
		field[chosenOne.y][chosenOne.x] = name;
	}
}
function findFloorIndices(field) {
	return field.reduce((acc, row, rowIndex) => {
		const indices = row.reduce((rowAcc, cell, colIndex) => {
			if (cell === "floor") {
				rowAcc.push({ x: colIndex, y: rowIndex });
			}
			return rowAcc;
		}, []);

		return acc.concat(indices);
	}, []);
}
