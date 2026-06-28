import React, {useState} from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, SafeAreaView, StatusBar,
} from 'react-native';

const ROLES = [
  {key: 'actor',    label: 'Actor',    color: '#C9956C'},
  {key: 'director', label: 'Director', color: '#4ADE80'},
  {key: 'writer',   label: 'Writer',   color: '#38BDF8'},
  {key: 'crew',     label: 'Crew',     color: '#FBBF24'},
  {key: 'producer', label: 'Producer', color: '#A78BFA'},
];

const GUIDE: Record<string, any[]> = {
  actor: [
    {icon: '📸', title: 'Perfect Your Portfolio', tips: ['Use a high-quality headshot with neutral background — casting directors see 100s of photos daily, yours must stand out.','Include 2-3 different looks: professional, casual, character. Show range.','Your portfolio photo should match how you actually look. Never use heavily edited or filtered photos.','Update your portfolio every 6 months or after a significant change in appearance.']},
    {icon: '🎭', title: 'What Directors Look For', tips: ['Directors want actors who take direction quickly. In auditions, when given feedback, adapt immediately — this shows professionalism.','Authenticity matters more than perfection. Raw, honest emotion beats technically correct but hollow performances.','Preparation shows respect. Know your lines, know the character, know the project.','Directors notice energy. Walk in confident, not desperate. You are also choosing them as much as they choose you.','Physical presence — posture, eye contact, and stillness are as important as dialogue delivery.']},
    {icon: '📋', title: 'Audition Preparation', tips: ['Read the entire script or as much as available — not just your sides. Understanding the full story changes your performance.','Research the director\'s previous work. Mention it naturally — shows you are invested.','Prepare 3 different interpretations of the scene. Directors may ask you to try different approaches.','Arrive 15 minutes early. Being late to an audition is never forgiven, even once.','After the audition, send a brief thank-you message. Most actors don\'t — it sets you apart.']},
    {icon: '🎬', title: 'On Set Behaviour', tips: ['Learn everyone\'s name on set — from the director to the production assistant. Reputation travels fast in the industry.','Never be on your phone between takes unless the director is also relaxed.','Be ready when called. "Almost ready" is not acceptable on a professional set.','Accept direction without arguing. Save disagreements for a private, respectful conversation.']},
    {icon: '💡', title: 'Common Mistakes to Avoid', tips: ['Don\'t over-act in auditions — subtlety reads better on camera than on stage.','Never bash other directors or productions in conversations — the industry is smaller than you think.','Avoid paying money to get roles. Legitimate casting calls never charge actors.','Don\'t neglect your physical fitness and voice training — these are professional tools.']},
    {icon: '🌟', title: 'Building Your Career', tips: ['Start with short films — they are the fastest way to build your reel and your network.','Take every role seriously, even small ones. Many successful actors were spotted in minor roles.','Join acting workshops and theatre groups. Continuous learning separates professionals from amateurs.','Network genuinely, not transactionally. Relationships built on mutual respect last decades.']},
  ],
  director: [
    {icon: '🎯', title: 'What Producers Look For', tips: ['Producers want directors with a clear vision — be able to explain your film in one compelling sentence.','Budget discipline is crucial. A director who can tell a great story within constraints is gold.','Producers look at your previous work intensely. Your short films are your business card.','Communication skills matter as much as creative vision. Can you lead a team of 30+ people?']},
    {icon: '🎭', title: 'Casting the Right Talent', tips: ['Cast for chemistry, not just individual talent. Two average actors with great chemistry outperform two stars without it.','Give actors room to bring their own interpretation first, then adjust.','In auditions, pay attention to how actors take direction — not just how well they perform unprompted.','Always have actors read opposite each other in callbacks. Chemistry cannot be faked.']},
    {icon: '📝', title: 'Pre-Production Excellence', tips: ['Storyboard every key scene. Visual clarity in prep means fewer expensive mistakes on set.','Hold a table read with the full cast before shooting. Script problems surface here, not on day 5.','Walk through every location before shoot day. Surprises on set day cost time and money.','Plan for 20% more time than you think you need. Every shoot has unexpected delays.']},
    {icon: '🎬', title: 'On Set Leadership', tips: ['Set the tone in the first hour of day one. How you handle the first problem sets the culture for the entire shoot.','Protect your actors\' emotional space. Great performances require psychological safety.','Make decisions quickly on set. Indecision is more damaging than an imperfect decision.','Praise publicly, correct privately. Embarrassing a crew member in front of others poisons the whole set.']},
    {icon: '💡', title: 'Storytelling Fundamentals', tips: ['Every scene must do two things: advance plot AND reveal character. If it only does one, cut or rewrite it.','The best directors trust the audience. Leave space for viewers to feel and interpret.','Visual storytelling is primary — if you need dialogue to explain what the audience should feel, the scene isn\'t working.','Study films you love in detail. Pause every 10 minutes and analyze why the scene works.']},
  ],
  writer: [
    {icon: '📖', title: 'What Directors Want', tips: ['Directors want scripts that are visual — write what the camera sees, not what characters think.','Avoid over-writing action lines. Describe only what is essential and visible.','Write dialogue that sounds like how people actually talk — with interruptions, incomplete thoughts, and subtext.','A great logline is not optional — it is the foundation of every pitch conversation.']},
    {icon: '✍️', title: 'Script Formatting', tips: ['Use industry-standard formatting: Courier 12pt, proper sluglines, action, character names centred above dialogue.','One page of script equals approximately one minute of screen time. Feature films: 90-120 pages.','Short films: 10-15 pages is the sweet spot for festivals and director interest.','Use Final Draft, Fade In, or Celtx. Never submit a script formatted in Word.']},
    {icon: '🎯', title: 'Pitching Your Script', tips: ['Know your logline cold: Character + Goal + Obstacle + Stakes in one sentence.','In a pitch meeting, tell the story with emotion — you are selling a feeling, not a plot summary.','Have a one-page synopsis ready, a full treatment, and the script. Have all three.','Be open to notes. Defensive writers don\'t get hired twice.']},
    {icon: '💡', title: 'Craft & Development', tips: ['Write your first draft fast without editing. The second draft is where writing actually happens.','Read your dialogue out loud. If it\'s hard to say, it will be hard to act.','Every character needs a clear want (external) and a need (internal). These must conflict.','Study screenplays of films you love — they are freely available online.']},
    {icon: '🌟', title: 'Building a Writing Career', tips: ['Write short films first. Directors can\'t afford to risk a feature on an unproven writer.','Network with directors actively. The best script-director relationships are built over coffee, not cold emails.','Write consistently. One page a day is 365 pages a year — more than three feature scripts.']},
  ],
  crew: [
    {icon: '🎥', title: 'Breaking Into the Industry', tips: ['Start by working for free on student films and short films. Every credit matters at the start.','Specialize in one department but be competent across several. Multi-skilled crew get called first.','Build a reel showing your specific craft — DOP, editor, sound designer — even from student projects.','Join industry groups on WhatsApp, Facebook, and LinkedIn. Most crew jobs are filled through word of mouth.']},
    {icon: '🛠️', title: 'On Set Professionalism', tips: ['Show up early, stay late, and never complain about hours in front of producers.','Anticipate needs before being asked. The best crew members solve problems their director hasn\'t noticed yet.','Your attitude matters as much as your skill. Directors choose crew they enjoy spending 16-hour days with.','Be meticulous about equipment care. Carelessness with gear ends careers.']},
    {icon: '💡', title: 'Department Tips', tips: ['DOP: Study natural light. The most beautiful shots often cost nothing.','Editor: Protect the story first. Every fancy cut that doesn\'t serve the story should be cut.','Sound: Bad sound kills a good film. Directors will forgive a shaky shot but not muffled dialogue.','Art Director: Research obsessively. Every object in frame should have a reason to be there.']},
    {icon: '🌟', title: 'Growing Your Career', tips: ['Assist department heads actively — observe, ask smart questions, and show initiative.','Develop relationships with directors early in their careers. You grow together.','Learn the business side — budgeting, scheduling, contracts. Technical crew who understand business get promoted.']},
  ],
  producer: [
    {icon: '💼', title: 'What Producers Do', tips: ['Producers are problem-solvers first, creative visionaries second. Your job is to make the director\'s vision possible.','Financing, scheduling, casting, distribution — a producer touches every department. Know each one deeply.','Build relationships with financiers, distributors, and festival programmers before you need them.','Know your numbers. A producer who cannot read a budget is not a producer.']},
    {icon: '🎯', title: 'Finding Projects', tips: ['Look for stories that are urgent, personal, and universal. The best films feel both intimate and enormous.','Develop relationships with writers early — before they\'re famous. Read widely and spot talent others miss.','The concept must be pitchable in one sentence. If you can\'t explain it simply, it isn\'t ready.']},
    {icon: '💰', title: 'Financing Your Film', tips: ['Start with government grants and film development funds — NFDC in India is your first stop.','Presales to streaming platforms and broadcasters can fund a significant portion of your budget.','Equity investors want returns — have a realistic distribution plan before approaching them.','Crowdfunding works for micro-budget films with strong community followings.']},
    {icon: '🤝', title: 'Working with Directors', tips: ['Choose directors whose vision you genuinely believe in — you will spend years together.','Be clear about creative boundaries from day one. Ambiguity causes conflict in post-production.','Support the director publicly, address concerns privately. A divided set is a failing set.']},
    {icon: '🌟', title: 'Distribution Strategy', tips: ['Think about distribution before you start shooting. Know who your audience is and where they watch.','OTT platforms in India — Netflix, Amazon, ZEE5, SonyLIV — are actively looking for content.','Social media marketing for films must start 6 months before release, not 6 weeks.']},
  ],
};

export default function IndustryGuideScreen({navigation}: any) {
  const [activeRole, setActiveRole] = useState('actor');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

  const guide = GUIDE[activeRole] || [];
  const activeRoleData = ROLES.find(r => r.key === activeRole);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🎬 Industry Guide</Text>
        <Text style={styles.headerSub}>Curated insights for film professionals</Text>
      </View>

      {/* ROLE TABS */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContent}>
        {ROLES.map(role => (
          <TouchableOpacity
            key={role.key}
            style={[
              styles.roleTab,
              activeRole === role.key && {
                backgroundColor: role.color + '22',
                borderColor: role.color,
              },
            ]}
            onPress={() => {
              setActiveRole(role.key);
              setExpandedIndex(0);
            }}>
            <Text
              allowFontScaling={false}
              style={[
                styles.roleTabText,
                activeRole === role.key && {color: role.color, fontWeight: '700'},
              ]}>
              {role.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* GUIDE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}>

        {/* ROLE BANNER */}
        <View style={[styles.roleBanner, {borderColor: activeRoleData?.color + '44'}]}>
          <Text style={styles.roleBannerTitle}>
            Guide for {activeRoleData?.label}
          </Text>
          <Text style={styles.roleBannerSub}>
            {guide.length} topics · {guide.reduce((a, b) => a + b.tips.length, 0)} professional tips
          </Text>
        </View>

        {/* ACCORDION CARDS */}
        {guide.map((section, index) => (
          <View key={index} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => setExpandedIndex(expandedIndex === index ? null : index)}
              activeOpacity={0.8}>
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardIcon}>{section.icon}</Text>
                <Text style={styles.cardTitle}>{section.title}</Text>
              </View>
              <Text style={[styles.expandIcon, {color: activeRoleData?.color || '#C9956C'}]}>
                {expandedIndex === index ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>

            {expandedIndex === index && (
              <View style={styles.tipsContainer}>
                {section.tips.map((tip: string, tipIndex: number) => (
                  <View key={tipIndex} style={styles.tipRow}>
                    <View style={[styles.tipDot, {backgroundColor: activeRoleData?.color || '#C9956C'}]} />
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={styles.bottomNote}>
          <Text style={styles.bottomNoteText}>
            💡 These insights are curated from industry professionals and film veterans across India's cinema industry.
          </Text>
        </View>

        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    {flex: 1, backgroundColor: '#0A0A0A'},
  header:       {paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12},
  backBtn:      {marginBottom: 10},
  backBtnText:  {color: '#C9956C', fontSize: 15, fontWeight: '600'},
  headerTitle:  {color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 4},
  headerSub:    {color: '#A09080', fontSize: 13},

  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  roleTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#1C1C1C',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  roleTabText: {
    color: '#A09080',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 24,
  },

  content:         {paddingHorizontal: 16, paddingTop: 16},
  roleBanner:      {backgroundColor: '#1C1C1C', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1},
  roleBannerTitle: {color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4},
  roleBannerSub:   {color: '#A09080', fontSize: 13},

  card:           {backgroundColor: '#1C1C1C', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden'},
  cardHeader:     {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18},
  cardHeaderLeft: {flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1},
  cardIcon:       {fontSize: 22},
  cardTitle:      {color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1},
  expandIcon:     {fontSize: 14, fontWeight: 'bold'},

  tipsContainer: {paddingHorizontal: 18, paddingBottom: 18, borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingTop: 14, gap: 14},
  tipRow:        {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  tipDot:        {width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0},
  tipText:       {color: '#A09080', fontSize: 14, lineHeight: 22, flex: 1, fontWeight: '300'},

  bottomNote:     {backgroundColor: '#1C1C1C', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#2A2A2A'},
  bottomNoteText: {color: '#A09080', fontSize: 13, lineHeight: 20, textAlign: 'center'},
});