// Global arrays and objects (extend with Connect data)
let places = [];
let posts = [
    { id: '1', placeId: 'ethiopia', content: 'Welcome to Ethiopia!', user: 'User1', timestamp: '2025-02-28T12:00:00Z' }
];
let knowledge = [];
let agents = [
    { id: 'agent1', placeId: 'ethiopia', name: 'Agent Abebe', isLive: false },
    { id: 'agent2', placeId: 'tigray-0', name: 'Agent Tadesse', isLive: true },
    { id: 'agent3', placeId: 'oromia-1', name: 'Agent Kebede', isLive: false }
];
let latest = [
    { id: 'latest1', placeId: 'ethiopia', content: 'Peace & Security: Stable in Ethiopia.', category: 'peace', timestamp: '2025-02-28T10:00:00Z' },
    { id: 'latest2', placeId: 'ethiopia', content: 'Weather: Sunny, 25°C in Addis.', category: 'weather', timestamp: '2025-02-28T11:00:00Z' },
    { id: 'latest3', placeId: 'ethiopia', content: 'Market: Coffee prices up 10%.', category: 'market', timestamp: '2025-02-28T12:00:00Z' },
    { id: 'latest4', placeId: 'ethiopia', content: 'Traffic: Heavy congestion on Ring Road.', category: 'traffic', timestamp: '2025-02-28T13:00:00Z' },
    { id: 'latest5', placeId: 'tigray-0', content: 'Peace & Security: Calm in Tigray.', category: 'peace', timestamp: '2025-02-28T14:00:00Z' }
];
let users = {}; // Simulated user data
let currentUser = null;

let connections = {
    friends: [],
    family: [],
    groups: {
        allPosts: [],
        country: {},
        region: {},
        zone: {},
        woreda: {},
        kebele: {},
        birthplace: {},
        school: {},
        family: [],
        friends: []
    },
    chats: {}
};

// Load places from JSON and precompute child counts
async function loadPlaces() {
    try {
        console.log('Fetching kebeles.json...');
        const response = await fetch('kebeles.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch kebeles.json: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Loaded raw data:', data.length, 'entries');
        console.log('First few entries:', data.slice(0, 3));

        places = [];
        const countryMap = new Map();
        const regionMap = new Map();
        const zoneMap = new Map();
        const woredaMap = new Map();

        data.forEach((item, index) => {
            const countryName = item['Level 1'];
            let countryId = countryName.toLowerCase().replace(/\s+/g, '-');
            if (!countryMap.has(countryName)) {
                countryMap.set(countryName, {
                    id: countryId,
                    name: countryName,
                    type: 'country',
                    parentId: null,
                    childCounts: { regions: 0, zones: 0, woredas: 0, kebeles: 0 }
                });
                places.push(countryMap.get(countryName));
            }
            const country = countryMap.get(countryName);

            if (item['Level 2']) {
                const regionKey = `${item['Level 2']}-${country.id}`;
                let regionId = `${item['Level 2'].toLowerCase().replace(/\s+/g, '-')}-${index}`;
                if (!regionMap.has(regionKey)) {
                    regionMap.set(regionKey, {
                        id: regionId,
                        name: item['Level 2'],
                        type: 'region',
                        parentId: country.id,
                        childCounts: { zones: 0, woredas: 0, kebeles: 0 }
                    });
                    places.push(regionMap.get(regionKey));
                    country.childCounts.regions++;
                }
                const region = regionMap.get(regionKey);

                if (item['Level 3']) {
                    const zoneKey = `${item['Level 3']}-${region.id}`;
                    let zoneId = `${item['Level 3'].toLowerCase().replace(/\s+/g, '-')}-${index}`;
                    if (!zoneMap.has(zoneKey)) {
                        zoneMap.set(zoneKey, {
                            id: zoneId,
                            name: item['Level 3'],
                            type: 'zone',
                            parentId: region.id,
                            childCounts: { woredas: 0, kebeles: 0 }
                        });
                        places.push(zoneMap.get(zoneKey));
                        region.childCounts.zones++;
                        country.childCounts.zones++;
                    }
                    const zone = zoneMap.get(zoneKey);

                    if (item['Level 4']) {
                        const woredaKey = `${item['Level 4']}-${zone.id}`;
                        let woredaId = `${item['Level 4'].toLowerCase().replace(/\s+/g, '-')}-${index}`;
                        if (!woredaMap.has(woredaKey)) {
                            woredaMap.set(woredaKey, {
                                id: woredaId,
                                name: item['Level 4'],
                                type: 'woreda',
                                parentId: zone.id,
                                childCounts: { kebeles: 0 }
                            });
                            places.push(woredaMap.get(woredaKey));
                            zone.childCounts.woredas++;
                            region.childCounts.woredas++;
                            country.childCounts.woredas++;
                        }
                        const woreda = woredaMap.get(woredaKey);

                        if (item['Level 5']) {
                            const kebeleId = `${item['Level 5'].toLowerCase().replace(/\s+/g, '-')}-${index}`;
                            places.push({
                                id: kebeleId,
                                name: item['Level 5'],
                                type: 'kebele',
                                parentId: woreda.id,
                                childCounts: {}
                            });
                            woreda.childCounts.kebeles++;
                            zone.childCounts.kebeles++;
                            region.childCounts.kebeles++;
                            country.childCounts.kebeles++;
                        }
                    }
                }
            }
        });

        console.log('Processed places:', places.length);
        console.log('Sample processed places:', places.slice(0, 5));
        window.placesLoaded = true;
        window.placesData = places;
        return places;
    } catch (error) {
        console.error('Error loading places:', error.message);
        window.placesLoaded = false;
        window.placesData = [];
        return [];
    }
}

// Get child counts for a place from precomputed values
function getChildCounts(placeId) {
    const place = places.find(p => p.id === placeId);
    if (!place || !place.childCounts) return '';

    const { regions, zones, woredas, kebeles } = place.childCounts;
    let display = [];

    if (place.type === 'country') {
        if (regions > 0) display.push(`${regions} region${regions > 1 ? 's' : ''}`);
        if (zones > 0) display.push(`${zones} zone${zones > 1 ? 's' : ''}`);
        if (woredas > 0) display.push(`${woredas} woreda${woredas > 1 ? 's' : ''}`);
        if (kebeles > 0) display.push(`${kebeles} kebele${kebeles > 1 ? 's' : ''}`);
    } else if (place.type === 'region') {
        if (zones > 0) display.push(`${zones} zone${zones > 1 ? 's' : ''}`);
        if (woredas > 0) display.push(`${woredas} woreda${woredas > 1 ? 's' : ''}`);
        if (kebeles > 0) display.push(`${kebeles} kebele${kebeles > 1 ? 's' : ''}`);
    } else if (place.type === 'zone') {
        if (woredas > 0) display.push(`${woredas} woreda${woredas > 1 ? 's' : ''}`);
        if (kebeles > 0) display.push(`${kebeles} kebele${kebeles > 1 ? 's' : ''}`);
    } else if (place.type === 'woreda') {
        if (kebeles > 0) display.push(`${kebeles} kebele${kebeles > 1 ? 's' : ''}`);
    }

    return display.length > 0 ? `[${display.join(', ')}]` : '';
}

// Get place object from placeId
function getPlaceFromId(placeId) {
    return places.find(p => p.id === placeId);
}

// Get group name for display
function getGroupName(groupId) {
    if (groupId === 'all-posts') return 'All Posts';
    const user = users[currentUser];
    if (groupId === user.address.country) return `Your Country: ${getPlaceFromId(user.address.country)?.name || 'Ethiopia'}`;
    if (groupId === user.address.region) return `Your Region: ${getPlaceFromId(user.address.region)?.name || 'Unknown'}`;
    if (groupId === user.address.zone) return `Your Zone: ${getPlaceFromId(user.address.zone)?.name || 'Unknown'}`;
    if (groupId === user.address.woreda) return `Your Woreda: ${getPlaceFromId(user.address.woreda)?.name || 'Unknown'}`;
    if (groupId === user.address.kebele) return `Your Kebele: ${getPlaceFromId(user.address.kebele)?.name || 'Unknown'}`;
    if (groupId === user.profile.birthplace?.kebele) return `Your Birthplace: ${getPlaceFromId(user.profile.birthplace?.kebele)?.name || 'Unknown'}`;
    if (groupId === user.profile.school?.name) return `Your School: ${user.profile.school?.name || 'Unknown'}`;
    if (groupId === 'family') return 'Your Family';
    if (groupId === 'friends') return 'Your Friends';
    return groupId;
}

// Load user connections based on profile
function loadConnections() {
    if (!currentUser || !users[currentUser]) return;

    const user = users[currentUser];
    const userPlace = getPlaceFromId(user.address.kebele);
    const birthPlace = getPlaceFromId(user.profile.birthplace?.kebele);
    const school = user.profile.school || {};

    // Populate groups based on profile
    connections.groups.country[userPlace?.parentId || 'ethiopia'] = [];
    connections.groups.region[user.address.region] = [];
    connections.groups.zone[user.address.zone] = [];
    connections.groups.woreda[user.address.woreda] = [];
    connections.groups.kebele[user.address.kebele] = [];
    connections.groups.birthplace[birthPlace?.id || 'unknown'] = [];
    connections.groups.school[school.name || 'unknown'] = [];

    // Simulate other users for connections
    for (let userId in users) {
        if (userId !== currentUser) {
            const otherUser = users[userId];
            const otherPlace = getPlaceFromId(otherUser.address.kebele);
            const otherBirthPlace = getPlaceFromId(otherUser.profile.birthplace?.kebele);
            const otherSchool = otherUser.profile.school || {};

            // Add to geographic groups
            if (otherPlace) {
                if (otherPlace.parentId === userPlace?.parentId) connections.groups.country[userPlace.parentId].push(otherUser);
                if (otherUser.address.region === user.address.region) connections.groups.region[user.address.region].push(otherUser);
                if (otherUser.address.zone === user.address.zone) connections.groups.zone[user.address.zone].push(otherUser);
                if (otherUser.address.woreda === user.address.woreda) connections.groups.woreda[user.address.woreda].push(otherUser);
                if (otherUser.address.kebele === user.address.kebele) connections.groups.kebele[user.address.kebele].push(otherUser);
            }

            // Add to birthplace group
            if (otherBirthPlace?.id === birthPlace?.id) connections.groups.birthplace[birthPlace.id].push(otherUser);

            // Add to school group
            if (otherSchool.name === school.name) connections.groups.school[school.name].push(otherUser);
        }
    }

    // Populate all posts
    connections.groups.allPosts = Object.values(users).map(u => ({
        user: u.identifier,
        content: `Joined Ahaze from ${u.address.kebele || 'Unknown'}`,
        timestamp: new Date().toISOString()
    }));
}

// Build sidenav hierarchy
function buildSidenav(places, section = 'explore', placeId = null) {
    console.log(`Building ${section} sidenav started`);
    const subList = document.getElementById(`${section}-sub-list`);
    if (!subList) {
        console.error(`${section}-sub-list element not found`);
        return;
    }
    subList.innerHTML = '';

    const buildList = (id, ulElement) => {
        let children;
        if (section === 'explore') {
            children = places.filter(place => place.parentId === id);
        } else if (section === 'agents') {
            children = agents.filter(agent => agent.placeId === id);
        } else if (section === 'latest') {
            children = latest.filter(l => l.placeId === id);
        } else if (section === 'connect') {
            loadConnections();
            children = Object.keys(connections.groups).map(groupId => ({
                name: getGroupName(groupId),
                id: groupId
            }));
        } else {
            return; // Other tabs don’t need sublists yet
        }
        console.log(`Building list for ${section} with id: ${id}, Found ${children.length} children`);
        if (children.length === 0) return;

        children.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            if (section === 'explore') {
                a.textContent = `${item.name} (${item.type}) ${getChildCounts(item.id)}`;
                a.dataset.placeId = item.id;
                a.onclick = (e) => {
                    e.preventDefault();
                    console.log('Clicked:', item.name, 'ID:', item.id);
                    toggleSubList(li, item.id, 'explore');
                    showPlaceContent(item.id);
                    updateAllSidenavs(item.id);
                };
            } else if (section === 'agents') {
                a.textContent = `${item.name}`;
                a.dataset.agentId = item.id;
                a.onclick = (e) => {
                    e.preventDefault();
                    console.log('Clicked agent:', item.name, 'ID:', item.id);
                };
                const liveButton = document.createElement('button');
                liveButton.className = 'live-button';
                liveButton.textContent = item.isLive ? 'Live' : 'Show Live';
                liveButton.onclick = (e) => {
                    e.preventDefault();
                    item.isLive = !item.isLive;
                    liveButton.textContent = item.isLive ? 'Live' : 'Show Live';
                    console.log(`${item.name} live status toggled to ${item.isLive}`);
                };
                li.appendChild(liveButton);
            } else if (section === 'latest') {
                a.textContent = `${item.content.substring(0, 20)}... (${item.category})`;
                a.dataset.latestId = item.id;
            } else if (section === 'connect') {
                a.textContent = item.name;
                a.dataset.groupId = item.id;
                a.onclick = (e) => {
                    e.preventDefault();
                    console.log('Clicked group:', item.name, 'ID:', item.id);
                    showConnectContent(item.id);
                };
            }
            li.insertBefore(a, li.firstChild);

            if (section === 'explore' || section === 'connect') {
                const subUl = document.createElement('ul');
                subUl.className = 'sub-list';
                li.appendChild(subUl);
            }
            ulElement.appendChild(li);
        });
    };

    const selectedPlaceId = placeId || document.querySelector('.nav-list a.active')?.dataset.placeId || 'ethiopia';
    if (section === 'explore') {
        buildList(null, subList);
    } else if (section === 'agents' || section === 'latest' || section === 'connect') {
        buildList(selectedPlaceId, subList);
    }
    console.log(`${section} sidenav completed`);
}

// Update all sidenavs and tabs based on selected place or group
function updateAllSidenavs(placeId) {
    const place = places.find(p => p.id === placeId);
    if (!place) return;

    document.getElementById('know-place-name-tab').textContent = place.name;
    document.getElementById('agents-place-name-tab').textContent = place.name;
    document.getElementById('latest-place-name-tab').textContent = place.name;
    buildSidenav(places, 'agents', placeId);
    buildSidenav(places, 'latest', placeId);
    buildSidenav(places, 'connect', placeId);
}

// Toggle sublist visibility and collapse others at same level
function toggleSubList(li, id, section) {
    const subList = li.querySelector('.sub-list');
    if (!subList) return;

    const parentUl = li.parentElement;
    const isShown = subList.classList.contains('show');

    parentUl.querySelectorAll('.sub-list.show').forEach(siblingSubList => {
        if (siblingSubList !== subList) {
            siblingSubList.classList.remove('show');
            collapseNestedSublists(siblingSubList);
            console.log(`Collapsed sibling sublist in ${section}: ${siblingSubList.parentElement.querySelector('a').textContent}`);
        }
    });

    if (!isShown && subList.children.length === 0 && (section === 'explore' || section === 'connect')) {
        const children = section === 'explore' ? places.filter(place => place.parentId === id) : 
            Object.keys(connections.groups).map(groupId => ({
                name: getGroupName(groupId),
                id: groupId
            }));
        console.log(`Lazy loading sublist for ${id} in ${section}, Found ${children.length} children`);
        children.forEach(child => {
            const subLi = document.createElement('li');
            const subA = document.createElement('a');
            subA.href = '#';
            if (section === 'explore') {
                subA.textContent = `${child.name} (${child.type}) ${getChildCounts(child.id)}`;
                subA.dataset.placeId = child.id;
                subA.onclick = (e) => {
                    e.preventDefault();
                    console.log('Clicked:', child.name, 'ID:', child.id);
                    toggleSubList(subLi, child.id, 'explore');
                    showPlaceContent(child.id);
                    updateAllSidenavs(child.id);
                };
            } else if (section === 'connect') {
                subA.textContent = child.name;
                subA.dataset.groupId = child.id;
                subA.onclick = (e) => {
                    e.preventDefault();
                    console.log('Clicked group:', child.name, 'ID:', child.id);
                    showConnectContent(child.id);
                };
            }
            subLi.appendChild(subA);

            const subUl = document.createElement('ul');
            subUl.className = 'sub-list';
            subLi.appendChild(subUl);
            subList.appendChild(subLi);
        });
    }

    if (!isShown) {
        subList.classList.add('show');
        console.log(`Expanded sublist in ${section}: ${li.querySelector('a').textContent}`);
    } else {
        subList.classList.remove('show');
        collapseNestedSublists(subList);
        console.log(`Collapsed sublist in ${section}: ${li.querySelector('a').textContent}`);
    }

    document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('active'));
    li.querySelector('a').classList.add('active');
}

// Collapse all nested sublists
function collapseNestedSublists(ulElement) {
    ulElement.querySelectorAll('.sub-list.show').forEach(nestedSubList => {
        nestedSubList.classList.remove('show');
        console.log(`Collapsed nested sublist: ${nestedSubList.parentElement.querySelector('a').textContent}`);
    });
}

// Show content for selected place (handles tabs)
function showPlaceContent(placeId) {
    console.log('showPlaceContent called with placeId:', placeId);
    const place = places.find(p => p.id === placeId);
    if (!place) return;

    const title = document.getElementById('place-title');
    title.textContent = place.name;

    const knowPlaceName = document.getElementById('know-place-name');
    const knowPlaceNameContent = document.getElementById('know-place-name-content');
    knowPlaceName.textContent = `Know ${place.name}`;
    knowPlaceNameContent.textContent = place.name;

    const agentsPlaceName = document.getElementById('agents-place-name');
    agentsPlaceName.textContent = place.name;

    const latestPlaceName = document.getElementById('latest-place-name');
    latestPlaceName.textContent = place.name;

    const tabsContainer = document.getElementById('place-tabs');
    tabsContainer.style.display = 'block';

    // Remove home content completely from DOM when not on Home
    document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');

    showTab('posts', placeId);
    updateAllSidenavs(placeId);
}

// Show specific tab content
function showTab(tabId, placeId) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    const activeContent = document.getElementById(`${tabId}-tab`);
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (activeContent && activeButton) {
        activeContent.style.display = 'block';
        activeButton.classList.add('active');
    }

    if (tabId === 'posts') {
        showPosts(placeId);
    } else if (tabId === 'know') {
        showKnowledge(placeId);
    } else if (tabId === 'agents') {
        showAgents(placeId);
    } else if (tabId === 'latest') {
        showLatest(placeId);
    } else if (tabId === 'profile') {
        showProfile();
    }

    // Ensure home content is removed when showing tabs
    document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
}

// Show posts for selected place
function showPosts(placeId) {
    console.log('showPosts called with placeId:', placeId);
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '';

    const placePosts = posts.filter(post => post.placeId === placeId);
    console.log('Posts for place:', placePosts);
    placePosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    placePosts.forEach(post => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${post.user}</strong>: ${post.content}
            <br><small>${new Date(post.timestamp).toLocaleString()}</small>
            ${post.mediaUrl ? `<br><img src="${post.mediaUrl}" alt="Post media" style="max-width: 200px;">` : ''}
            ${post.videoUrl ? `<br><video controls src="${post.videoUrl}" style="max-width: 200px;"></video>` : ''}
            ${post.fileUrl ? `<br><a href="${post.fileUrl}" target="_blank">Download File</a>` : ''}
        `;
        postsList.appendChild(li);
    });
}

// Show knowledge for selected place
function showKnowledge(placeId) {
    console.log('showKnowledge called with placeId:', placeId);
    const knowList = document.getElementById('know-list');
    knowList.innerHTML = '';

    const placeKnowledge = knowledge.filter(k => k.placeId === placeId);
    console.log('Knowledge for place:', placeKnowledge);
    placeKnowledge.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    placeKnowledge.forEach(k => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${k.user}</strong>: ${k.content}
            <br><small>${new Date(k.timestamp).toLocaleString()}</small>
        `;
        knowList.appendChild(li);
    });
}

// Show agents for selected place
function showAgents(placeId) {
    console.log('showAgents called with placeId:', placeId);
    const agentsList = document.getElementById('agents-list');
    agentsList.innerHTML = '';

    const placeAgents = agents.filter(agent => agent.placeId === placeId);
    console.log('Agents for place:', placeAgents);
    placeAgents.forEach(agent => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = `${agent.name}`;
        a.dataset.agentId = agent.id;
        a.onclick = (e) => {
            e.preventDefault();
            console.log('Clicked agent:', agent.name, 'ID:', agent.id);
        };
        const liveButton = document.createElement('button');
        liveButton.className = 'live-button';
        liveButton.textContent = agent.isLive ? 'Live' : 'Show Live';
        liveButton.onclick = (e) => {
            e.preventDefault();
            agent.isLive = !agent.isLive;
            liveButton.textContent = agent.isLive ? 'Live' : 'Show Live';
            console.log(`${agent.name} live status toggled to ${agent.isLive}`);
        };
        li.appendChild(a);
        li.appendChild(liveButton);
        agentsList.appendChild(li);
    });
}

// Show latest updates for selected place
function showLatest(placeId) {
    console.log('showLatest called with placeId:', placeId);
    const latestList = document.getElementById('latest-list');
    latestList.innerHTML = '';

    const placeLatest = latest.filter(l => l.placeId === placeId);
    console.log('Latest for place:', placeLatest);
    placeLatest.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    placeLatest.forEach(l => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${l.category.charAt(0).toUpperCase() + l.category.slice(1)}:</strong> ${l.content}
            <br><small>${new Date(l.timestamp).toLocaleString()}</small>
        `;
        latestList.appendChild(li);
    });
}

// Get a readable statement for a place
function getPlaceStatement(placeId) {
    const place = places.find(p => p.id === placeId);
    if (!place) return '';

    if (place.type === 'country') {
        return `${place.name} is a country ${getChildCounts(place.id)}`;
    }

    const parent = places.find(p => p.id === place.parentId);
    if (!parent) return `${place.name} is a ${place.type} ${getChildCounts(place.id)}`;

    if (place.type === 'region') {
        return `${place.name} is a region in ${parent.name} ${getChildCounts(place.id)}`;
    } else if (place.type === 'zone') {
        const region = places.find(p => p.id === parent.parentId);
        return `${place.name} is a zone in ${parent.name}, ${region ? region.name : 'Ethiopia'} ${getChildCounts(place.id)}`;
    } else if (place.type === 'woreda') {
        const zone = places.find(p => p.id === parent.parentId);
        const region = places.find(p => p.id === zone?.parentId);
        return `${place.name} is a woreda in ${parent.name}, ${region ? region.name : 'Ethiopia'} ${getChildCounts(place.id)}`;
    } else if (place.type === 'kebele') {
        const woreda = places.find(p => p.id === parent.parentId);
        const zone = places.find(p => p.id === woreda?.parentId);
        const region = places.find(p => p.id === zone?.parentId);
        return `${place.name} is a kebele in ${parent.name}, ${region ? region.name : 'Ethiopia'} ${getChildCounts(place.id)}`;
    }
    return `${place.name} is a ${place.type} ${getChildCounts(place.id)}`;
}

// Handle search functionality
function handleSearch() {
    const searchInput = document.getElementById('search-input') || document.getElementById('connect-search-input');
    const searchResults = document.getElementById('search-results') || document.getElementById('connect-search-results');
    const query = searchInput.value.trim().toLowerCase();

    if (query.length < 2) {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        return;
    }

    const filteredPlaces = places.filter(place => 
        place.name.toLowerCase().includes(query) || place.id.toLowerCase().includes(query)
    ).slice(0, 10);

    console.log('Search query:', query, 'Results:', filteredPlaces.length);

    if (filteredPlaces.length === 0) {
        searchResults.innerHTML = '<li>No results found</li>';
    } else {
        searchResults.innerHTML = '';
        filteredPlaces.forEach(place => {
            const li = document.createElement('li');
            li.textContent = getPlaceStatement(place.id);
            li.onclick = () => {
                console.log('Search result clicked:', place.name, 'ID:', place.id);
                selectPlaceFromSearch(place.id);
                searchResults.classList.remove('show');
                searchInput.value = '';
            };
            searchResults.appendChild(li);
        });
    }
    searchResults.classList.add('show');
}

// Select place from search and expand its hierarchy
function selectPlaceFromSearch(placeId) {
    document.querySelectorAll('.sub-list.show').forEach(subList => {
        subList.classList.remove('show');
    });

    const place = places.find(p => p.id === placeId);
    if (!place) return;

    const path = [];
    let currentPlace = place;
    while (currentPlace) {
        path.unshift(currentPlace);
        currentPlace = places.find(p => p.id === currentPlace.parentId);
    }

    let currentUl = document.getElementById('explore-sub-list');
    path.forEach((pathPlace, index) => {
        let li = Array.from(currentUl.children).find(child => 
            child.querySelector('a')?.dataset.placeId === pathPlace.id
        );
        if (!li) {
            li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = `${pathPlace.name} (${pathPlace.type}) ${getChildCounts(pathPlace.id)}`;
            a.dataset.placeId = pathPlace.id;
            a.onclick = (e) => {
                e.preventDefault();
                console.log('Clicked:', pathPlace.name, 'ID:', pathPlace.id);
                toggleSubList(li, pathPlace.id, 'explore');
                showPlaceContent(pathPlace.id);
                updateAllSidenavs(pathPlace.id);
            };
            li.appendChild(a);
            const subUl = document.createElement('ul');
            subUl.className = 'sub-list';
            li.appendChild(subUl);
            currentUl.appendChild(li);
        }

        const subList = li.querySelector('.sub-list');
        if (subList && index < path.length - 1) {
            subList.classList.add('show');
            console.log(`Expanded sublist for ${pathPlace.name} (${pathPlace.type})`);
            currentUl = subList;
        }
        document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('active'));
        li.querySelector('a').classList.add('active');
    });

    showPlaceContent(placeId);
}

// Handle post submission with media
function handlePostSubmit(e) {
    e.preventDefault();
    console.log('handlePostSubmit triggered');
    const text = document.getElementById('post-text').value.trim();
    const mediaFiles = document.getElementById('post-media').files;
    const selectedPlaceId = document.querySelector('.nav-list a.active')?.dataset.placeId;

    console.log('Text:', text, 'Media files:', mediaFiles.length, 'Selected Place ID:', selectedPlaceId);

    if (!text || !selectedPlaceId) {
        alert('Please enter a post and select a place.');
        console.log('Post submission aborted: Missing text or place');
        return;
    }

    const newPost = {
        id: Date.now().toString(),
        placeId: selectedPlaceId,
        content: text,
        user: 'CurrentUser',
        timestamp: new Date().toISOString()
    };

    if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
            newPost.mediaUrl = URL.createObjectURL(file);
        } else if (fileType.startsWith('video/')) {
            newPost.videoUrl = URL.createObjectURL(file);
        } else if (fileType === 'application/pdf') {
            newPost.fileUrl = URL.createObjectURL(file);
        }
        console.log('Media added:', fileType, 'URL:', newPost.mediaUrl || newPost.videoUrl || newPost.fileUrl);
    }

    posts.push(newPost);
    console.log('New post added:', newPost);
    showPosts(selectedPlaceId);
    updateAllSidenavs(selectedPlaceId);
    document.getElementById('post-form').reset();
    document.getElementById('media-preview').innerHTML = '';
}

// Handle knowledge submission
function handleKnowledgeSubmit(e) {
    e.preventDefault();
    console.log('handleKnowledgeSubmit triggered');
    const text = document.getElementById('know-text').value.trim();
    const selectedPlaceId = document.querySelector('.nav-list a.active')?.dataset.placeId;

    console.log('Knowledge Text:', text, 'Selected Place ID:', selectedPlaceId);

    if (!text || !selectedPlaceId) {
        alert('Please enter some knowledge and select a place.');
        console.log('Knowledge submission aborted: Missing text or place');
        return;
    }

    const newKnowledge = {
        id: Date.now().toString(),
        placeId: selectedPlaceId,
        content: text,
        user: 'CurrentUser',
        timestamp: new Date().toISOString()
    };

    knowledge.push(newKnowledge);
    console.log('New knowledge added:', newKnowledge);
    showKnowledge(selectedPlaceId);
    updateAllSidenavs(selectedPlaceId);
    document.getElementById('know-text').value = '';
}

// Preview media files before posting
document.getElementById('post-media')?.addEventListener('change', (e) => {
    const files = e.target.files;
    const preview = document.getElementById('media-preview');
    preview.innerHTML = '';
    Array.from(files).forEach(file => {
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            preview.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            preview.appendChild(video);
        } else if (fileType === 'application/pdf') {
            const span = document.createElement('span');
            span.textContent = `PDF: ${file.name}`;
            preview.appendChild(span);
        }
    });
});

// Handle sign-up and login forms in modal
document.getElementById('signUpBtn')?.addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('signUpForm').style.display = 'block';
    document.getElementById('loginForm').style.display = 'none';
    waitForPlacesData(places => populateAddressDropdowns(places, null, 'signUp'));
});

document.getElementById('loginBtn')?.addEventListener('click', () => {
    document.getElementById('auth-modal').style.display = 'flex';
    document.getElementById('signUpForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
});

document.querySelectorAll('.close-modal')?.forEach(button => {
    button.addEventListener('click', () => {
        document.getElementById('auth-modal').style.display = 'none';
    });
});

document.getElementById('signUpForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('signUpIdentifier').value;
    const password = document.getElementById('signUpPassword').value;
    const country = document.getElementById('signUpCountry').value;
    const region = document.getElementById('signUpRegion').value;
    const zone = document.getElementById('signUpZone').value;
    const woreda = document.getElementById('signUpWoreda').value;
    const kebele = document.getElementById('signUpKebele').value;
    const otherLevel = document.getElementById('signUpOtherLevel').value;

    const userId = Date.now().toString();
    users[userId] = {
        id: userId,
        identifier,
        password,
        address: { country, region, zone, woreda, kebele, otherLevel },
        profile: {}
    };
    currentUser = userId;
    console.log('User Signed Up:', users[userId]);
    alert('Sign Up successful! (Simulated)');
    document.getElementById('auth-modal').style.display = 'none';
    document.getElementById('signUpForm').reset();
    showProfile();
});

document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('loginIdentifier').value;
    const password = document.getElementById('loginPassword').value;

    for (let userId in users) {
        if ((users[userId].identifier === identifier || users[userId].identifier === `+251${identifier}`) && users[userId].password === password) {
            currentUser = userId;
            console.log('User Logged In:', users[userId]);
            alert('Login successful! (Simulated)');
            document.getElementById('auth-modal').style.display = 'none';
            document.getElementById('loginForm').reset();
            showProfile();
            return;
        }
    }
    alert('Invalid credentials! (Simulated)');
});

// Show profile with tabbed layout
function showProfile() {
    if (!currentUser) {
        alert('Please log in or sign up first!');
        return;
    }

    const profileTab = document.getElementById('profile-tab');
    document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
    document.getElementById('place-title').style.display = 'none';
    document.getElementById('place-tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
    profileTab.style.display = 'block';

    // Clear existing content and create tabbed layout
    profileTab.innerHTML = `
        <h3>My Profile</h3>
        <div class="profile-tabs">
            <button class="profile-tab-button active" data-tab="address">Address</button>
            <button class="profile-tab-button" data-tab="birth">Birth Information</button>
            <button class="profile-tab-button" data-tab="school">School</button>
            <button class="profile-tab-button" data-tab="family">Family</button>
            <button class="profile-tab-button" data-tab="work">Workplace</button>
        </div>
        <form id="profileForm" novalidate>
            <div id="tab-address" class="profile-tab-content active">
                <h4>Address</h4>
                <select id="profileCountry" required></select>
                <select id="profileRegion" required></select>
                <select id="profileZone" required></select>
                <select id="profileWoreda" required></select>
                <select id="profileKebele" required></select>
                <input type="text" id="profileOtherLevel" placeholder="Other Level (optional)">
            </div>
            <div id="tab-birth" class="profile-tab-content">
                <h4>Birth Information</h4>
                <select id="profileBirthCountry" required></select>
                <select id="profileBirthRegion" required></select>
                <select id="profileBirthZone" required></select>
                <select id="profileBirthWoreda" required></select>
                <select id="profileBirthKebele" required></select>
                <input type="text" id="profileBirthOther" placeholder="Other Birthplace (optional)">
            </div>
            <div id="tab-school" class="profile-tab-content">
                <h4>School</h4>
                <input type="text" id="profileElementary" placeholder="Elementary School">
                <input type="text" id="profileHighSchool" placeholder="High School">
                <input type="text" id="profilePreparatory" placeholder="Preparatory School">
                <input type="text" id="profileUniversity" placeholder="University">
            </div>
            <div id="tab-family" class="profile-tab-content">
                <h4>Family</h4>
                <input type="text" id="profileFatherName" placeholder="Father's Full Name">
                <input type="text" id="profileMotherName" placeholder="Mother's Full Name">
                <input type="text" id="profileRelated" placeholder="Related Family Details (optional)">
            </div>
            <div id="tab-work" class="profile-tab-content">
                <h4>Workplace</h4>
                <input type="text" id="profileWorkplace" placeholder="Workplace Name">
                <input type="text" id="profileJobTitle" placeholder="Job Title (optional)">
                <input type="text" id="profileWorkAddress" placeholder="Work Address (optional)">
            </div>
            <button type="submit">Save Profile</button>
        </form>
    `;

    const user = users[currentUser];
    waitForPlacesData(places => {
        populateAddressDropdowns(places, user.address?.kebele, 'profile');
        populateAddressDropdowns(places, user.profile?.birthplace?.kebele, 'profileBirth');
    });

    // Pre-fill profile data
    document.getElementById('profileElementary').value = user.profile?.elementary || '';
    document.getElementById('profileHighSchool').value = user.profile?.highSchool || '';
    document.getElementById('profilePreparatory').value = user.profile?.preparatory || '';
    document.getElementById('profileUniversity').value = user.profile?.university || '';
    document.getElementById('profileFatherName').value = user.profile?.fatherName || '';
    document.getElementById('profileMotherName').value = user.profile?.motherName || '';
    document.getElementById('profileRelated').value = user.profile?.related || '';
    document.getElementById('profileWorkplace').value = user.profile?.workplace || '';
    document.getElementById('profileJobTitle').value = user.profile?.jobTitle || '';
    document.getElementById('profileWorkAddress').value = user.profile?.workAddress || '';

    // Initialize profile tabs
    initializeProfileTabs();

    // Handle profile form submission
    document.getElementById('profileForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert('Please log in or sign up first!');
            return;
        }

        const user = users[currentUser];
        user.profile = {
            address: {
                country: document.getElementById('profileCountry').value,
                region: document.getElementById('profileRegion').value,
                zone: document.getElementById('profileZone').value,
                woreda: document.getElementById('profileWoreda').value,
                kebele: document.getElementById('profileKebele').value,
                otherLevel: document.getElementById('profileOtherLevel').value
            },
            birthplace: {
                country: document.getElementById('profileBirthCountry').value,
                region: document.getElementById('profileBirthRegion').value,
                zone: document.getElementById('profileBirthZone').value,
                woreda: document.getElementById('profileBirthWoreda').value,
                kebele: document.getElementById('profileBirthKebele').value,
                other: document.getElementById('profileBirthOther').value
            },
            elementary: document.getElementById('profileElementary').value,
            highSchool: document.getElementById('profileHighSchool').value,
            preparatory: document.getElementById('profilePreparatory').value,
            university: document.getElementById('profileUniversity').value,
            fatherName: document.getElementById('profileFatherName').value,
            motherName: document.getElementById('profileMotherName').value,
            related: document.getElementById('profileRelated').value,
            workplace: document.getElementById('profileWorkplace').value,
            jobTitle: document.getElementById('profileJobTitle').value,
            workAddress: document.getElementById('profileWorkAddress').value
        };
        console.log('Profile Saved:', user);
        alert('Profile saved successfully! (Simulated)');
        document.getElementById('profileForm').reset();
    });
}

// Initialize profile tabs
function initializeProfileTabs() {
    const profileTabButtons = document.querySelectorAll('.profile-tab-button');
    profileTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.profile-tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.profile-tab-content').forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            const tabId = button.dataset.tab;
            document.getElementById(`tab-${tabId}`).classList.add('active');
        });
    });
}

// Show Connect content (groups and chats)
function showConnectContent(groupId) {
    if (!currentUser) {
        alert('Please log in or sign up first!');
        return;
    }

    document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
    document.getElementById('place-title').style.display = 'none';
    document.getElementById('place-tabs').style.display = 'none';
    document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');

    const connectTab = document.createElement('div');
    connectTab.id = 'connect-tab';
    connectTab.innerHTML = `
        <h1>Connect with Ethiopians</h1>
        <div id="connect-tabs">
            <button class="tab-button active" data-tab="groups">Groups</button>
            <button class="tab-button" data-tab="chats">Chats</button>
        </div>
        <div id="groups-tab" class="tab-content" style="display: block;">
            <h3>Community Groups</h3>
            <ul id="groups-list"></ul>
            <form id="group-post-form" enctype="multipart/form-data">
                <textarea id="group-post-text" placeholder="Post to your group..." rows="4"></textarea>
                <input type="file" id="group-post-media" accept="*" multiple>
                <div id="group-media-preview" class="media-preview"></div>
                <button type="submit">Post</button>
            </form>
        </div>
        <div id="chats-tab" class="tab-content" style="display: none;">
            <h3>Private Chats</h3>
            <select id="chat-user-select">
                <option value="">Select a user to chat...</option>
            </select>
            <div id="chat-window" class="chat-window"></div>
            <form id="chat-form">
                <input type="text" id="chat-message" placeholder="Type a message..." required>
                <input type="file" id="chat-file" accept="*" multiple>
                <div id="chat-media-preview" class="media-preview"></div>
                <button type="submit">Send</button>
            </form>
        </div>
    `;
    document.querySelector('.content').innerHTML = '';
    document.querySelector('.content').appendChild(connectTab);

    loadConnections();
    buildSidenav(places, 'connect', groupId);
    showConnectTab('groups', groupId);
}

// Show specific Connect tab (groups or chats)
function showConnectTab(tabId, groupId = 'all-posts') {
    const tabContents = document.querySelectorAll('#connect-tab .tab-content');
    tabContents.forEach(content => content.style.display = 'none');

    const tabButtons = document.querySelectorAll('#connect-tabs .tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    const activeContent = document.getElementById(`${tabId}-tab`);
    const activeButton = document.querySelector(`#connect-tabs .tab-button[data-tab="${tabId}"]`);
    if (activeContent && activeButton) {
        activeContent.style.display = 'block';
        activeButton.classList.add('active');
    }

    if (tabId === 'groups') {
        showGroupContent(groupId);
    } else if (tabId === 'chats') {
        showChats();
    }
}

// Show group content (posts and files)
function showGroupContent(groupId) {
    const groupsList = document.getElementById('groups-list');
    groupsList.innerHTML = '';

    const groupPosts = connections.groups[groupId] || connections.groups.allPosts;
    if (Array.isArray(groupPosts)) {
        groupPosts.forEach(post => {
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${post.user}</strong>: ${post.content || 'No content'}
                <br><small>${new Date(post.timestamp).toLocaleString()}</small>
                ${post.fileUrl ? `<br><a href="${post.fileUrl}" target="_blank">Download File</a>` : ''}
            `;
            groupsList.appendChild(li);
        });
    } else {
        groupsList.innerHTML = '<li>No posts in this group yet.</li>';
    }
}

// Handle group post submission with media
function handleGroupPostSubmit(e) {
    e.preventDefault();
    console.log('handleGroupPostSubmit triggered');
    const text = document.getElementById('group-post-text').value.trim();
    const mediaFiles = document.getElementById('group-post-media').files;
    const selectedGroupId = document.querySelector('.nav-list a.active')?.dataset.groupId || 'all-posts';

    console.log('Text:', text, 'Media files:', mediaFiles.length, 'Selected Group ID:', selectedGroupId);

    if (!text) {
        alert('Please enter a post.');
        console.log('Post submission aborted: Missing text');
        return;
    }

    const newPost = {
        user: users[currentUser].identifier,
        content: text,
        timestamp: new Date().toISOString()
    };

    if (mediaFiles.length > 0) {
        const file = mediaFiles[0];
        newPost.fileUrl = URL.createObjectURL(file);
        console.log('File added:', file.type, 'URL:', newPost.fileUrl);
    }

    if (!connections.groups[selectedGroupId]) connections.groups[selectedGroupId] = [];
    connections.groups[selectedGroupId].push(newPost);
    console.log('New group post added:', newPost);
    showGroupContent(selectedGroupId);
    document.getElementById('group-post-form').reset();
    document.getElementById('group-media-preview').innerHTML = '';
}

// Preview media/files before posting
document.getElementById('group-post-media')?.addEventListener('change', (e) => {
    const files = e.target.files;
    const preview = document.getElementById('group-media-preview');
    preview.innerHTML = '';
    Array.from(files).forEach(file => {
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            preview.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            preview.appendChild(video);
        } else if (fileType.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
            preview.appendChild(audio);
        } else if (fileType === 'application/pdf' || fileType.includes('document') || fileType.includes('spreadsheet')) {
            const span = document.createElement('span');
            span.textContent = `File: ${file.name}`;
            preview.appendChild(span);
        } else {
            const span = document.createElement('span');
            span.textContent = `Unsupported File: ${file.name}`;
            preview.appendChild(span);
        }
    });
});

// Handle chat functionality
function showChats() {
    const chatUserSelect = document.getElementById('chat-user-select');
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';

    // Populate user select with other users
    chatUserSelect.innerHTML = '<option value="">Select a user to chat...</option>';
    for (let userId in users) {
        if (userId !== currentUser) {
            const option = document.createElement('option');
            option.value = userId;
            option.textContent = users[userId].identifier;
            chatUserSelect.appendChild(option);
        }
    }

    chatUserSelect.addEventListener('change', (e) => {
        const selectedUserId = e.target.value;
        if (selectedUserId) {
            loadChat(selectedUserId);
        }
    });
}

function loadChat(otherUserId) {
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';

    if (!connections.chats[currentUser]) connections.chats[currentUser] = {};
    if (!connections.chats[currentUser][otherUserId]) connections.chats[currentUser][otherUserId] = [];

    connections.chats[currentUser][otherUserId].forEach(message => {
        const msgDiv = document.createElement('div');
        msgDiv.className = message.from === currentUser ? 'sent' : 'received';
        msgDiv.innerHTML = `
            <strong>${users[message.from].identifier}</strong>: ${message.content}
            <br><small>${new Date(message.timestamp).toLocaleString()}</small>
            ${message.fileUrl ? `<br><a href="${message.fileUrl}" target="_blank">Download File</a>` : ''}
        `;
        chatWindow.appendChild(msgDiv);
    });
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function handleChatSubmit(e) {
    e.preventDefault();
    const message = document.getElementById('chat-message').value.trim();
    const files = document.getElementById('chat-file').files;
    const otherUserId = document.getElementById('chat-user-select').value;

    if (!message || !otherUserId) {
        alert('Please enter a message and select a user.');
        return;
    }

    const newMessage = {
        from: currentUser,
        to: otherUserId,
        content: message,
        timestamp: new Date().toISOString()
    };

    if (files.length > 0) {
        const file = files[0];
        newMessage.fileUrl = URL.createObjectURL(file);
        console.log('File added to chat:', file.type, 'URL:', newMessage.fileUrl);
    }

    if (!connections.chats[currentUser]) connections.chats[currentUser] = {};
    if (!connections.chats[currentUser][otherUserId]) connections.chats[currentUser][otherUserId] = [];
    connections.chats[currentUser][otherUserId].push(newMessage);

    if (!connections.chats[otherUserId]) connections.chats[otherUserId] = {};
    if (!connections.chats[otherUserId][currentUser]) connections.chats[otherUserId][currentUser] = [];
    connections.chats[otherUserId][currentUser].push({
        from: currentUser,
        to: otherUserId,
        content: message,
        timestamp: newMessage.timestamp,
        fileUrl: newMessage.fileUrl
    });

    loadChat(otherUserId);
    document.getElementById('chat-form').reset();
    document.getElementById('chat-media-preview').innerHTML = '';
}

// Preview chat files before sending
document.getElementById('chat-file')?.addEventListener('change', (e) => {
    const files = e.target.files;
    const preview = document.getElementById('chat-media-preview');
    preview.innerHTML = '';
    Array.from(files).forEach(file => {
        const fileType = file.type;
        if (fileType.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            preview.appendChild(img);
        } else if (fileType.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = URL.createObjectURL(file);
            video.controls = true;
            preview.appendChild(video);
        } else if (fileType.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = URL.createObjectURL(file);
            audio.controls = true;
            preview.appendChild(audio);
        } else if (fileType === 'application/pdf' || fileType.includes('document') || fileType.includes('spreadsheet')) {
            const span = document.createElement('span');
            span.textContent = `File: ${file.name}`;
            preview.appendChild(span);
        } else {
            const span = document.createElement('span');
            span.textContent = `Unsupported File: ${file.name}`;
            preview.appendChild(span);
        }
    });
});

// Wait for window.placesData to be loaded
function waitForPlacesData(callback) {
    if (window.placesData && window.placesData.length > 0) {
        callback(window.placesData);
    } else {
        setTimeout(() => waitForPlacesData(callback), 100); // Poll every 100ms
    }
}

// Load places for dropdowns
function loadPlacesForDropdowns(places) {
    const countries = places.filter(p => p.type === 'country');
    const regions = places.filter(p => p.type === 'region');
    const zones = places.filter(p => p.type === 'zone');
    const woredas = places.filter(p => p.type === 'woreda');
    const kebeles = places.filter(p => p.type === 'kebele');

    return { countries, regions, zones, woredas, kebeles };
}

// Populate address dropdowns
function populateAddressDropdowns(places, placeId = null, prefix = 'signUp') {
    const { countries, regions, zones, woredas, kebeles } = loadPlacesForDropdowns(places);

    const countrySelect = document.getElementById(`${prefix}Country`);
    const regionSelect = document.getElementById(`${prefix}Region`);
    const zoneSelect = document.getElementById(`${prefix}Zone`);
    const woredaSelect = document.getElementById(`${prefix}Woreda`);
    const kebeleSelect = document.getElementById(`${prefix}Kebele`);

    // Ensure selects exist before proceeding
    if (!countrySelect || !regionSelect || !zoneSelect || !woredaSelect || !kebeleSelect) {
        console.error('One or more dropdown elements not found in DOM');
        return;
    }

    // Clear existing options, but preserve the selected value
    const preserveSelected = (select, newOptions) => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select...</option>';
        newOptions.forEach(optionData => {
            const option = document.createElement('option');
            option.value = optionData.id;
            option.textContent = optionData.name;
            if (option.value === currentValue) option.selected = true;
            select.appendChild(option);
        });
        return currentValue;
    };

    // Populate countries
    preserveSelected(countrySelect, countries);

    // Handle changes for dynamic population, preserving selections
    countrySelect.addEventListener('change', () => {
        const countryValue = countrySelect.value;
        if (countryValue) {
            preserveSelected(regionSelect, regions.filter(r => r.parentId === countryValue));
            regionSelect.dispatchEvent(new Event('change')); // Trigger region change to cascade
        } else {
            [regionSelect, zoneSelect, woredaSelect, kebeleSelect].forEach(select => {
                select.innerHTML = '<option value="">Select...</option>';
            });
        }
    });

    regionSelect.addEventListener('change', () => {
        const regionValue = regionSelect.value;
        if (regionValue) {
            preserveSelected(zoneSelect, zones.filter(z => z.parentId === regionValue));
            zoneSelect.dispatchEvent(new Event('change')); // Trigger zone change to cascade
        } else {
            [zoneSelect, woredaSelect, kebeleSelect].forEach(select => {
                select.innerHTML = '<option value="">Select...</option>';
            });
        }
    });

    zoneSelect.addEventListener('change', () => {
        const zoneValue = zoneSelect.value;
        if (zoneValue) {
            preserveSelected(woredaSelect, woredas.filter(w => w.parentId === zoneValue));
            woredaSelect.dispatchEvent(new Event('change')); // Trigger woreda change to cascade
        } else {
            [woredaSelect, kebeleSelect].forEach(select => {
                select.innerHTML = '<option value="">Select...</option>';
            });
        }
    });

    woredaSelect.addEventListener('change', () => {
        const woredaValue = woredaSelect.value;
        if (woredaValue) {
            preserveSelected(kebeleSelect, kebeles.filter(k => k.parentId === woredaValue));
        } else {
            kebeleSelect.innerHTML = '<option value="">Select...</option>';
        }
    });

    // If editing, pre-populate with placeId
    if (placeId) {
        const place = places.find(p => p.id === placeId);
        if (place) {
            let current = place;
            let path = [];
            while (current) {
                path.unshift(current);
                current = places.find(p => p.id === current.parentId);
            }

            path.forEach((p, i) => {
                if (i === 0) countrySelect.value = p.id;
                else if (i === 1) regionSelect.value = p.id;
                else if (i === 2) zoneSelect.value = p.id;
                else if (i === 3) woredaSelect.value = p.id;
                else if (i === 4) kebeleSelect.value = p.id;
            });

            // Trigger change events to populate lower levels, preserving selections
            countrySelect.dispatchEvent(new Event('change'));
            if (regionSelect.value) regionSelect.dispatchEvent(new Event('change'));
            if (zoneSelect.value) zoneSelect.dispatchEvent(new Event('change'));
            if (woredaSelect.value) woredaSelect.dispatchEvent(new Event('change'));
        }
    }
}
// Navigate to other sections
document.querySelectorAll('.feature-link, .nav-list a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const path = link.getAttribute('data-path');
        console.log('Navigating to:', path);
        if (path === '/') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/"]').classList.add('nav-active');
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'flex');
            document.getElementById('place-title').style.display = 'none';
            document.getElementById('place-tabs').style.display = 'none';
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            document.getElementById('connect-tab')?.remove();
        } else if (path === '/explore') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/explore"]').classList.add('nav-active');
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
            document.getElementById('place-title').style.display = 'block';
            document.getElementById('place-tabs').style.display = 'block';
            showPlaceContent('ethiopia');
            toggleSubList(document.querySelector('.nav-list li:nth-child(2)'), null, 'explore');
            document.getElementById('connect-tab')?.remove();
        } else if (path === '/market') {
            // Placeholder for Market (implement similarly if needed)
            alert('Market feature coming soon!');
        } else if (path === '/connect') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/connect"]').classList.add('nav-active');
            showConnectContent('all-posts');
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
            document.getElementById('place-title').style.display = 'none';
            document.getElementById('place-tabs').style.display = 'none';
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
        } else if (path === '/organizations') {
            // Placeholder for Organizations
            alert('Organizations feature coming soon!');
        } else if (path === '/knowledge-center') {
            // Placeholder for Knowledge Center
            alert('Knowledge Center feature coming soon!');
        } else if (path === '/agents') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/agents"]').classList.add('nav-active');
            const selectedPlaceId = document.querySelector('.nav-list a.active')?.dataset.placeId || 'ethiopia';
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
            document.getElementById('place-title').style.display = 'block';
            document.getElementById('place-tabs').style.display = 'block';
            showTab('agents', selectedPlaceId);
            buildSidenav(places, 'agents', selectedPlaceId);
            document.getElementById('connect-tab')?.remove();
        } else if (path === '/latest') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/latest"]').classList.add('nav-active');
            const selectedPlaceId = document.querySelector('.nav-list a.active')?.dataset.placeId || 'ethiopia';
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
            document.getElementById('place-title').style.display = 'block';
            document.getElementById('place-tabs').style.display = 'block';
            showTab('latest', selectedPlaceId);
            buildSidenav(places, 'latest', selectedPlaceId);
            document.getElementById('connect-tab')?.remove();
        } else if (path === '/profile') {
            document.querySelectorAll('.nav-list a').forEach(a => a.classList.remove('nav-active'));
            document.querySelector('.nav-list a[data-path="/profile"]').classList.add('nav-active');
            showProfile();
            document.querySelectorAll('.home-content').forEach(content => content.style.display = 'none');
            document.getElementById('place-title').style.display = 'none';
            document.getElementById('place-tabs').style.display = 'none';
            document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
            document.getElementById('connect-tab')?.remove();
        }
    });
});

// Initialize and set up navigation and events
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded, initializing...');
    try {
        const loadedPlaces = await loadPlaces();
        window.places = loadedPlaces.length === 0 ? [
            { id: 'ethiopia', name: 'Ethiopia', type: 'country', parentId: null, childCounts: { regions: 0, zones: 0, woredas: 0, kebeles: 0 } },
            { id: 'oromia', name: 'Oromia', type: 'region', parentId: 'ethiopia', childCounts: { zones: 0, woredas: 0, kebeles: 0 } },
            { id: 'jimma', name: 'Jimma', type: 'zone', parentId: 'oromia', childCounts: { woredas: 0, kebeles: 0 } }
        ] : loadedPlaces;

        if (window.placesLoaded) {
            buildSidenav(window.places, 'explore');
            buildSidenav(window.places, 'agents', 'ethiopia');
            buildSidenav(window.places, 'latest', 'ethiopia');
            buildSidenav(window.places, 'connect', 'ethiopia');
        }

        const homeLink = document.querySelector('.nav-list a[data-path="/"]');
        if (homeLink) {
            homeLink.click();
        }

        const postForm = document.getElementById('post-form');
        if (postForm) {
            postForm.addEventListener('submit', handlePostSubmit);
            console.log('Post form event listener added');
        }

        const knowForm = document.getElementById('know-form');
        if (knowForm) {
            knowForm.addEventListener('submit', handleKnowledgeSubmit);
            console.log('Know form event listener added');
        }

        const searchInput = document.getElementById('search-input');
        const searchButton = document.getElementById('search-button');
        if (searchInput && searchButton) {
            searchInput.addEventListener('input', handleSearch);
            searchButton.addEventListener('click', () => searchInput.focus());
            console.log('Search input and button initialized');
        }

        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                const selectedPlaceId = document.querySelector('.nav-list a.active')?.dataset.placeId || 'ethiopia';
                showTab(tabId, selectedPlaceId);
            });
        });

        const groupPostForm = document.getElementById('group-post-form');
        if (groupPostForm) {
            groupPostForm.addEventListener('submit', handleGroupPostSubmit);
        }

        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', handleChatSubmit);
        }
    } catch (error) {
        console.error('Initialization error:', error.message);
    }
});