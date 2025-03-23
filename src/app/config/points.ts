export const POINTS = {
  // Participation
  GRADIENT_CONNECT_SIGNUP: 10,
  GRADIENT_CONNECT_ATTENDANCE: 15,
  
  // Content
  READING_LIST_ADD: 5,
  WORKSHOP_PRESENTATION: 100,
  WORKSHOP_ATTENDANCE: 5,
  WORKSHOP_QUESTION: 20,
  JOB_POST: 10,
  
  // Profile
  PROFILE_COMPLETION: 20,
  
  // Engagement
  FIRST_LOGIN_STREAK: 20,
  WEEKLY_LOGIN: 5,

  // Community
  REFERRAL: 100,
  EVENT_ORGANIZATION: 100,
  PROJECT_CONTRIBUTION: 100,
} as const;

export type PointCategory = 'participation' | 'content' | 'community' | 'engagement';
export type PointAction = {
  value: number;
  label: string;
};

export type PointsSystemType = {
  [K in PointCategory]: {
    [key: string]: PointAction;
  };
};

export const POINTS_SYSTEM: PointsSystemType = {
  participation: {
    workshop_attendance: {
      value: POINTS.WORKSHOP_ATTENDANCE,
      label: 'Attending a workshop'
    },
    workshop_presentation: {
      value: POINTS.WORKSHOP_PRESENTATION,
      label: 'Presenting at a workshop'
    },
    good_question: {
      value: POINTS.WORKSHOP_QUESTION,
      label: 'Asking good questions during workshops'
    },
    gradient_connect: {
      value: POINTS.GRADIENT_CONNECT_ATTENDANCE,
      label: 'Participating in Gradient Connect'
    }
  },
  content: {
    reading_list: {
      value: POINTS.READING_LIST_ADD,
      label: 'Adding to reading list'
    },
    job_post: {
      value: POINTS.JOB_POST,
      label: 'Posting a job opportunity'
    }
  },
  community: {
    referral: {
      value: POINTS.REFERRAL,
      label: 'Referring a new member'
    },
    event_organization: {
      value: POINTS.EVENT_ORGANIZATION,
      label: 'Organizing a community event'
    },
    project_contribution: {
      value: POINTS.PROJECT_CONTRIBUTION,
      label: 'Contributing to community projects'
    }
  },
  engagement: {
    login_streak: {
      value: POINTS.FIRST_LOGIN_STREAK,
      label: 'First 4-week login streak'
    },
    weekly_login: {
      value: POINTS.WEEKLY_LOGIN,
      label: 'Weekly login'
    },
    profile_completion: {
      value: POINTS.PROFILE_COMPLETION,
      label: 'Completing your profile'
    }
  }
}; 