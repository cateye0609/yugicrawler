export function getMonsterType(types) {
	const monsterType = ['fusion', 'synchro', 'xyz', 'link', 'ritual', 'pendulum'];
	return monsterType.find(e => types.toLowerCase().includes(e));
}
