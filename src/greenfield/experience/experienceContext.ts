import { createActorContext } from '@xstate/react';
import { experienceMachine } from './experienceMachine';

export const ExperienceActorContext = createActorContext(experienceMachine);

