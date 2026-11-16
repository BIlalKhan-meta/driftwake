// Driftwake - Quest System

import { COLORS } from './config.js';

export const QUEST_TYPES = {
  TREASURE: 'treasure',
  RAIDERS: 'raiders',
  EXPLORATION: 'exploration',
  TIME: 'time'
};

export const QUEST_LIST = [
  {
    id: 'treasure_3',
    type: QUEST_TYPES.TREASURE,
    target: 3,
    reward: 150,
    description: 'Bring me 3 chests',
    difficulty: 'storm',
    icon: '💰'
  },
  {
    id: 'raider_5',
    type: QUEST_TYPES.RAIDERS,
    target: 5,
    reward: 200,
    description: 'Sink 5 raiders',
    difficulty: 'storm',
    icon: '⚔️'
  },
  {
    id: 'treasure_5',
    type: QUEST_TYPES.TREASURE,
    target: 5,
    reward: 300,
    description: 'Bring me 5 chests',
    difficulty: 'dread',
    icon: '💎'
  },
  {
    id: 'raider_10',
    type: QUEST_TYPES.RAIDERS,
    target: 10,
    reward: 500,
    description: 'Sink 10 raiders',
    difficulty: 'dread',
    icon: '🏆'
  }
];

export function createQuestSystem() {
  return {
    activeQuest: null,
    completedQuests: [],
    questProgress: {}
  };
}

export function getAvailableQuest(difficulty) {
  // Return a quest based on difficulty
  const appropriate = QUEST_LIST.filter(q => q.difficulty === difficulty);
  if (appropriate.length === 0) return null;
  
  // Return a random quest not yet completed
  const available = appropriate.filter(q => !this?.completedQuests?.includes(q.id));
  if (available.length === 0) return null;
  
  return available[Math.floor(Math.random() * available.length)];
}

export function updateQuestProgress(questState, type, amount = 1) {
  if (!questState.activeQuest) return false;
  
  const quest = questState.activeQuest;
  
  if (quest.type !== type) return false;
  
  if (questState.questProgress[quest.id]) {
    questState.questProgress[quest.id] += amount;
  } else {
    questState.questProgress[quest.id] = amount;
  }
  
  const progress = questState.questProgress[quest.id];
  const completed = progress >= quest.target;
  
  if (completed && !questState.completedQuests.includes(quest.id)) {
    questState.completedQuests.push(quest.id);
    return 'completed';
  }
  
  return 'progress';
}

export function checkQuestCompletion(questState) {
  if (!questState.activeQuest) return null;
  
  const progress = questState.questProgress[questState.activeQuest.id] || 0;
  if (progress >= questState.activeQuest.target) {
    return {
      type: 'completed',
      quest: questState.activeQuest,
      progress,
      target: questState.activeQuest.target
    };
  }
  
  return {
    type: 'in-progress',
    quest: questState.activeQuest,
    progress,
    target: questState.activeQuest.target
  };
}