// TODO: cache professor data

function createLinkEl(id) {
    const linkEl = document.createElement('a')
    linkEl.classList.add('rmp-link')
    linkEl.href = `https://www.ratemyprofessors.com/professor/${id}`
    linkEl.target = '_blank'
    linkEl.innerHTML = '<i class="fa fa-external-link"></i>'
    linkEl.title = 'View on RateMyProfessor'
    return linkEl
}

function getTdSelector() {
    if (isOverviewPage()) {
        return 'td:nth-of-type(8)'
    } else if (document.querySelector('#enabled_panel')) {
        return 'td:nth-of-type(7)'
    } else if (document.querySelector('#disabled_panel')) {
        return 'td:nth-of-type(6)'
    }
}

function isOverviewPage() {
    return [
        '/courses',
        '/courses/',
        '/options',
        '/options/'
    ].some(v => window.location.pathname.endsWith(v))
}

async function searchProfessor(query) {
    const urlQuery = new URLSearchParams({ query })
    const req = await fetch(`https://ratemyprofessor-api.streamcord.workers.dev/professors/search?${urlQuery}`)
    return await req.json()
}

async function main() {
    const profNames = []

    const tableRows = document.querySelectorAll('table tr')

    for (const row of tableRows) {
        const profNameCell = row.querySelector(getTdSelector())
        if (!profNameCell) {
            continue
        }

        const profName = profNameCell.innerText
        if (!profName) {
            continue
        }

        profNames.push(profName)
    }

    function getTableCellsByProfName(name) {
        const cells = []
        for (const row of tableRows) {
            const profNameCell = row.querySelector(getTdSelector())
            if (!profNameCell) {
                continue
            }

            const profName = profNameCell.innerText
            if (profName === name) {
                cells.push(profNameCell)
            }
        }
        return cells
    }

    const uniqueProfNames = [...new Set(profNames)]

    for (const prof of uniqueProfNames) {
        const profReq = await searchProfessor(prof)
        const profDetails = profReq?.data?.search?.teachers?.edges?.[0]?.node
        if (!profDetails) {
            // Unable to get professor details
            console.warn('Failed to get professor details for', prof, profReq)
            continue
        }

        const id = profDetails.legacyId
        const difficulty = profDetails.avgDifficulty
        const rating = profDetails.avgRating
        const takeAgain = Math.round(profDetails.wouldTakeAgainPercent)

        const rows = getTableCellsByProfName(prof)
        for (const row of rows) {
            if (profDetails.numRatings === 0) {
                // Professor has no ratings
                const ratingEl = document.createElement('div')
                ratingEl.classList.add('rmp-rating')
                ratingEl.innerText = 'N/A'
                ratingEl.title = 'This professor has no ratings'

                row.append(ratingEl, createLinkEl(id))
                continue
            }

            // Overall rating
            const ratingEl = document.createElement('div')
            ratingEl.classList.add('rmp-rating')
            if (rating >= 4) {
                ratingEl.classList.add('rmp-rating--5')
            } else if (rating >= 3) {
                ratingEl.classList.add('rmp-rating--3')
            } else {
                ratingEl.classList.add('rmp-rating--1')
            }
            ratingEl.innerText = rating.toString()
            ratingEl.title = `Rating: ${rating} / 5`

            // Difficulty rating
            const difficultyEl = document.createElement('div')
            difficultyEl.classList.add('rmp-rating')
            difficultyEl.innerText = difficulty.toString()
            difficultyEl.title = `Difficulty: ${difficulty} / 5`

            // Student take again percent
            const takeAgainEl = document.createElement('div')
            takeAgainEl.classList.add('rmp-rating')
            takeAgainEl.innerText = `${takeAgain}%`
            takeAgainEl.title = `${takeAgain}% of students would take a class with this professor again`
            
            row.append(
                ratingEl,
                difficultyEl,
                takeAgainEl,
                createLinkEl(id)
            )
        }
    }
}

window.onload = () => {
    let lastFetchedURL = null
    const mainEl = document.querySelector('main')
    const observer = new MutationObserver(async (mutationList, _) => {
        for (const mut of mutationList) {
            if (mut.addedNodes) {
                // check to see if the user switched between the "enabled" and "disabled" tabs
                if (mut.addedNodes[0] == document.querySelector('#enabled_panel')) {
                    // force re-fetch
                    lastFetchedURL = null
                }

                // check to see if the table exists in the DOM
                if (document.querySelector('table') && lastFetchedURL != window.location.pathname) {
                    lastFetchedURL = window.location.pathname
                    console.log('[RMP] Fetching data')
                    console.time('[RMP] Fetch data')
                    await main()
                    console.timeEnd('[RMP] Fetch data')
                }
            }
        }
    })
    observer.observe(mainEl, { childList: true, subtree: true })
}