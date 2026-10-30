function validateProfile(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Enter valid profile details.');
    const result = {};
    for (const [field, max] of Object.entries({ name: 80, email: 254, phoneNumber: 25, bio: 500, college: 120, location: 100 })) {
        if (input[field] === undefined) continue;
        if (typeof input[field] !== 'string') throw new Error(`${field} must be text.`);
        result[field] = input[field].trim();
        if (result[field].length > max) throw new Error(`${field} must be ${max} characters or fewer.`);
    }
    if ('name' in result && result.name.length < 2) throw new Error('Your name needs at least two characters.');
    if ('email' in result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid email address.');
    if (result.phoneNumber && (!/^\+?[0-9 ()-]+$/.test(result.phoneNumber) || !/^[0-9]{7,15}$/.test(result.phoneNumber.replace(/\D/g, '')))) throw new Error('Enter a phone number with 7–15 digits.');
    if (input.skills !== undefined) {
        if (!Array.isArray(input.skills) || input.skills.length > 12 || input.skills.some((skill) => typeof skill !== 'string' || !skill.trim() || skill.trim().length > 32)) throw new Error('Add up to 12 skills, each 1–32 characters long.');
        const seen = new Set();
        result.skills = input.skills.map((skill) => skill.trim()).filter((skill) => !seen.has(skill.toLowerCase()) && seen.add(skill.toLowerCase()));
    }
    for (const field of ['githubUrl', 'portfolioUrl']) {
        if (input[field] === undefined) continue;
        if (typeof input[field] !== 'string' || input[field].length > 300) throw new Error('Enter a valid website URL.');
        result[field] = input[field].trim();
        if (!result[field]) continue;
        let url;
        try { url = new URL(result[field]); } catch { throw new Error('Website links must start with https:// or http://.'); }
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('Use a public http:// or https:// website link.');
        if (field === 'githubUrl' && !['github.com', 'www.github.com'].includes(url.hostname)) throw new Error('Your GitHub link must be on github.com.');
    }
    if (input.avatarUrl !== undefined) {
        if (typeof input.avatarUrl !== 'string' || input.avatarUrl.length > 300000 || (input.avatarUrl && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(input.avatarUrl))) throw new Error('Choose a PNG, JPEG, or WebP profile photo.');
        result.avatarUrl = input.avatarUrl;
    }
    return result;
}
module.exports = { validateProfile };
