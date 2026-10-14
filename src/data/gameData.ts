export interface RoundData {
  roundNumber: number;
  openingQuestion: string;
  seriousCardA: string;
  seriousCardB: string;
  followupQuestion: string;
  discussionPoints: string;
}

export const ROUNDS_DATA: RoundData[] = [
  {
    roundNumber: 1,
    openingQuestion: "What is Islam, and what makes it different from other religions?",
    seriousCardA:
      "Islam is about worshipping one God and living according to His guidance. Muslims believe the Qur’an is His final revelation and Muhammad ﷺ is His final messenger. We also believe in earlier prophets, including Abraham, Moses, and Jesus.",
    seriousCardB:
      "At Islam’s center is the belief that God is absolutely one, without partners or equals. Muslims follow the Qur’an and Prophet Muhammad ﷺ while honoring earlier prophets. That combination of beliefs distinguishes Islam from other faiths.",
    followupQuestion:
      "If Islam, Christianity, and Judaism all believe in one God, why should someone follow Islam instead?",
    discussionPoints:
      "Muslims respect the shared roots of these faiths, but they also make different claims about revelation, Jesus, and prophethood. Islam teaches that the Qur’an is God’s final revelation and that Muhammad ﷺ is His final messenger. A thoughtful starting point is to examine the Qur’an and the evidence for Muhammad’s prophethood rather than choosing a religion only from family, culture, or familiarity.",
  },
  {
    roundNumber: 2,
    openingQuestion: "Why do Muslim women wear hijab?",
    seriousCardA:
      "Muslim women wear hijab as an act of worship and obedience to God. In mainstream Islamic teaching, it includes covering the hair, dressing modestly, and behaving with modesty. Many Muslim women also see it as an expression of faith and identity.",
    seriousCardB:
      "Hijab is part of a broader Islamic teaching about modesty and devotion. It is not only about clothing. Muslim men also have responsibilities, and the Qur’an tells men to lower their gaze before discussing women’s dress.",
    followupQuestion:
      "If hijab is about modesty, why aren’t Muslim men required to cover their hair too? Isn’t that unfair?",
    discussionPoints:
      "Islam gives men and women the same moral worth while assigning some different responsibilities. Men are also commanded to dress modestly and lower their gaze. Hair covering is part of the responsibility given to women in mainstream Islamic teaching, while men have their own requirements. Different obligations do not automatically mean one gender has greater worth.",
  },
  {
    roundNumber: 3,
    openingQuestion: "Why do Muslims believe the Quran is the word of God?",
    seriousCardA:
      "Muslims point to the Qur’an’s message, coherence, distinctive Arabic style, and the life of the Prophet who delivered it. The Qur’an also repeatedly invites people to question, reflect, and examine its claims.",
    seriousCardB:
      "Muslims see a cumulative case in the Qur’an’s teachings, literary qualities, historical impact, and the credibility of Prophet Muhammad ﷺ. Its preservation allows people today to investigate the same text, although preservation by itself is not the only reason Muslims believe it is divine.",
    followupQuestion:
      "How do you know the Quran hasn’t been changed over the past 1,400 years?",
    discussionPoints:
      "The Qur’an was preserved through both memorization and written transmission from the earliest Muslim community. Early manuscripts, widespread memorization, and documented teaching traditions allow the text to be checked across generations. The recognized Qur’anic readings are part of the transmitted tradition rather than evidence of an uncontrolled changing text.",
  },
  {
    roundNumber: 4,
    openingQuestion: "If Allah is merciful and loving, why does He allow innocent people to suffer?",
    seriousCardA:
      "There’s wisdom behind every ease and hardship we go through. Suffering doesn’t mean someone deserved it, but that moment could bring us closer to God or gain us reward. Take for example when a woman is going through labor and experiencing some of the worst pain she’ll ever experience in her life. Islam teaches us that for every pain she feels she earns reward.",
    seriousCardB:
      "In Islam, this life is a test, not the final place where every account is settled. Some suffering results from human choices, while some comes through circumstances beyond us. A tragedy is not automatically a punishment, and Islam teaches that no pain or injustice is lost because complete justice continues in the next life.",
    followupQuestion:
      "If everything happens by Allah’s will, why should people be held responsible for their actions?",
    discussionPoints:
      "Allah’s will means that nothing occurs outside His knowledge and power, but people still make real choices and are judged for what they intend and choose within their ability. Knowing or allowing a choice is not the same as forcing someone to make it. Islam holds both truths together: God is sovereign, and human beings are morally responsible.",
  },
  {
    roundNumber: 5,
    openingQuestion:
      "If Islam is the true religion, why are there so many different sects and interpretations within Islam?",
    seriousCardA:
      "Islam distinguishes between revelation and people’s attempts to understand it. Muslims share central beliefs such as one God, the Qur’an, and Muhammad ﷺ, while disagreements developed over law, leadership, and interpretation. Human disagreement does not by itself make the original message false.",
    seriousCardB:
      "Some differences among Muslims are accepted scholarly differences in how rulings are understood. Others involve deeper questions of belief or authority. A fair approach is to identify what Muslims broadly agree on, understand why a disagreement exists, and then evaluate Islam’s central claims on their own evidence.",
    followupQuestion:
      "If Muslims themselves disagree about what Islam teaches, how can you confidently tell someone that Islam is the truth?",
    discussionPoints:
      "Confidence does not require pretending that every Muslim agrees about every issue. It comes from examining the evidence for Islam’s central claims. Disagreement exists in many serious fields without proving that truth does not exist. Muslims return to the Qur’an, the authentic teachings of the Prophet ﷺ, and sound scholarship when evaluating competing interpretations.",
  },
  {
    roundNumber: 6,
    openingQuestion: "Is Sharia law really about harsh punishments?",
    seriousCardA:
      "Sharia is much broader than criminal law. It includes worship, charity, family responsibilities, business ethics, personal conduct, and justice. Classical criminal penalties are only one small and highly regulated part of a much larger moral and legal framework.",
    seriousCardB:
      "Sharia simply means the guidelines Muslims follow for how to live. Smiling is Sharia. Honoring your parents and being kind to older people are Sharia. The media often reduces Sharia to punishments, but those are only a small part of a much broader way of life.",
    followupQuestion:
      "If Islam teaches mercy and forgiveness, how do Muslims explain punishments mentioned in classical Islamic law?",
    discussionPoints:
      "Islamic law treats mercy and accountability as compatible. Classical punishments came with strict evidence requirements, legal safeguards, judicial authority, and room for repentance or forgiveness in relevant cases. Individuals cannot enforce them themselves. These rulings should be understood within a complete legal system, not as isolated viral examples or vigilante violence.",
  },
  {
    roundNumber: 7,
    openingQuestion: "Why do Muslims believe Prophet Muhammad ﷺ was a true prophet?",
    seriousCardA:
      "Before receiving revelation, Muhammad ﷺ was already known for honesty and trustworthiness. When he publicly warned the people of Makkah, even his opponents admitted that they had never known him to lie. He then remained consistent in his message through years of persecution, leadership, and eventual victory.",
    seriousCardB:
      "Muslims see the Qur’an as Prophet Muhammad’s ﷺ enduring miracle. His character, truthfulness, consistency under persecution, and the transformation produced by his message form a cumulative case for his prophethood.",
    followupQuestion:
      "Why should we believe in Prophet Muhammad’s words if he came 600 years after Jesus?",
    discussionPoints:
      "Coming later does not make a prophet false. Earlier prophets also came centuries apart. Muslims believe Muhammad ﷺ confirmed the original message of earlier prophets while bringing the final revelation. His claim should be judged through the Qur’an, his character, his life, and whether his message consistently calls people to worship the same one God worshipped by Abraham, Moses, and Jesus.",
  },
];

export const SILLY_CARDS: string[] = [
  "I’m sorry, I don’t know.",
  "Point behind them and say, ‘Look!’ Then run away when they turn around.",
  "Because I said so.",
  "‘I think I left the stove on.’ Runs away.",
  "Siiiix Seeveeen.",
  "RKO them.",
  "Blow them away with a fart so powerful it’s capable of waking giants from their 100-year slumber.",
  "Pull out an Uno reverse card.",
  "Challenge them to rock, paper, scissors. Winner is correct.",
  "Start speaking in Minecraft enchantment-table language.",
  "‘That sounds like a future-me problem.’",
  "Pretend to receive an urgent phone call.",
  "Slowly back away without breaking eye contact.",
  "Ask if you can use a lifeline.",
  "Phone a friend.",
  "Open the weather app.",
  "‘Let me cook,’ then stand there silently.",
  "Draw a diagram that somehow turns into a fish.",
  "‘The answer is in the group chat.’",
  "Hand them a calculator.",
  "‘Is this going to be on the exam?’",
  "Flip a coin and nod confidently.",
  "‘According to my calculations...’ Then calculate nothing.",
  "Ask ChatGPT.",
  "Start buffering in real life.",
  "Repeat the question back in a dramatic movie-trailer voice.",
  "Whisper, ‘The prophecy is coming true.’",
  "‘Can we circle back to this next quarter?’",
  "Tag in the nearest person.",
  "‘I plead the fifth.’",
  "Offer them a free trial of your answer.",
  "Search your pockets like the answer fell out.",
  "‘That information is classified.’",
  "Ask them to submit the question in writing within 3–5 business days.",
  "Put your phone on airplane mode and throw it at their face to see if it flies.",
  "‘Chat, am I cooked?’",
  "Close your eyes and pretend the Wi-Fi disconnected.",
  "Start a countdown from ten for no reason.",
  "‘I know a guy who knows a guy.’",
  "Blame Mercury being in Gatorade.",
  "Pull out a whiteboard and write, ‘Step 1: Panic.’",
  "‘My lawyer advised me not to answer that.’",
  "Pretend the question activated your fight-or-flight response.",
  "Ask them to define every word in the question.",
  "Give them a thumbs-up and walk away.",
  "‘That depends. What answer were you hoping for?’",
  "Start speaking like a GPS: ‘Recalculating...’",
  "‘Watch this.’ Make fart noises with your armpit.",
  "Dramatically open a fortune cookie.",
  "‘Source: trust me.’",
  "Ask for a commercial break.",
  "‘I can neither confirm nor deny.’",
  "Call in an air strike.",
  "‘Respectfully, I was not prepared for this side quest.’",
  "Drop the mic and walk away.",
  "Ask them to repeat the question while you stare at the ceiling for answers.",
  "‘Let’s agree to disagree before I even answer.’",
  "Pretend an invisible producer is speaking through your earpiece.",
  "‘Excellent question,’ then immediately change the subject.",
  "Ask them, ‘English or Spanish?’ Then quickly search up the answer.",
];
