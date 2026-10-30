const Team = require('../models/Team');
const Submission = require('../models/Submission');
const Evaluation = require('../models/Evaluation');
const Certificate = require('../models/Certificate');

exports.getMyActivity = async (req, res) => {
    try {
        const teams = await Team.find({ members: req.user.id }).populate('hackathon', 'name status dates finalPublished hostedBy');
        const eventIds = teams.filter((team) => team.hackathon).map((team) => team.hackathon._id);
        const [submissions, evaluations, certificates] = await Promise.all([
            Submission.find({ team: { $in: teams.map((team) => team._id) } }).select('team round submittedAt'),
            Evaluation.find({ hackathon: { $in: eventIds }, round: 'final' }).select('hackathon team totalScore').sort({ totalScore: -1 }),
            Certificate.find({ user: req.user.id }).populate('hackathon', 'name hostedBy dates'),
        ]);
        res.json({
            events: teams.filter((team) => team.hackathon).map((team) => {
                const event = team.hackathon;
                const ranked = evaluations.filter((row) => String(row.hackathon) === String(event._id));
                const position = ranked.findIndex((row) => String(row.team) === String(team._id));
                return { id: String(event._id), name: event.name, hostedBy: event.hostedBy, date: event.dates?.startDate, status: event.status, teamName: team.name, isLeader: String(team.leader) === String(req.user.id), round1: submissions.some((entry) => String(entry.team) === String(team._id) && entry.round === 'round1'), final: submissions.some((entry) => String(entry.team) === String(team._id) && entry.round === 'final'), rank: event.finalPublished && position >= 0 ? position + 1 : null, isDemo: false };
            }),
            certificates: certificates.filter((entry) => entry.hackathon && entry.certificateUrl).map((entry) => ({ id: String(entry._id), eventId: String(entry.hackathon._id), eventName: entry.hackathon.name, date: entry.generatedAt, url: entry.certificateUrl, type: entry.type, isDemo: false })),
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};
