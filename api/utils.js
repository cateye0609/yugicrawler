export function getMonsterType(types) {
	const monsterType = ['normal', 'fusion', 'synchro', 'xyz', 'link', 'ritual', 'pendulum'];
	return monsterType.find(e => types.toLowerCase().includes(e));
}
