import LeadssTable from '@/components/Team/LeadsTable'
import Footer from '@/components/shared/Footer'

const LeadsList = () => {
    return (
        <>
            <div className='main-content'>
                <div className='row'>
                    <LeadssTable />
                </div>
            </div>
            <Footer/>
        </>
    )
}

export default LeadsList