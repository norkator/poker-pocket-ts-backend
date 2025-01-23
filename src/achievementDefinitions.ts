import {AchievementDefinition} from './interfaces';

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: 100,
    name: 'First Win',
    description: 'Win your first game',
    icon: 'shaded_medal_one',
  },
  {
    id: 110,
    name: 'Winning Streak',
    description: 'Win two games in a row',
    icon: 'shaded_medal_two',
  },
];

export function getAchievementDefinitionById(
  id: number
): AchievementDefinition {
  const definition = achievementDefinitions.find((achievement) => achievement.id === id);
  return definition ? definition : {id: -1, name: '', description: '', icon: 'shaded_medal_blank'};
}
